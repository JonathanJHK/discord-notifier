import { fetchJsonWithRetry } from './provider-http.js';

import type {
  MangaCandidate,
  MangaDetails,
  MangaNamedResource,
  MangaProvider,
  MangaSearchWindow,
} from './manga-provider.js';

const JIKAN_EDGE_BASE_URL = 'https://jikan.lucashdo.com/v1';

interface JikanEdgeManga {
  malId: number;

  title: string;

  titleEnglish?: string | null;
  titleJapanese?: string | null;

  url?: string | null;

  imageUrl?: string | null;

  type?: string | null;

  status?: string | null;
  publishing?: boolean;

  published?: {
    from?: string | null;
    to?: string | null;
    string?: string | null;
  };
}

interface JikanEdgeResponse {
  data: JikanEdgeManga[];

  meta: {
    cached?: boolean;
    stale?: boolean;
    refreshFailed?: boolean;

    fetchedAt?: string;

    pagination?: {
      page: number;

      limit: number | null;
      count: number;

      total: number | null;

      hasNextPage: boolean;
    };
  };
}

interface JikanEdgeNamedResource {
  malId: number;
  name: string;
  url?: string | null;
}

interface JikanEdgeMangaDetails {
  malId: number;

  url?: string | null;

  imageUrl?: string | null;

  images?: {
    small?: string | null;
    medium?: string | null;
    large?: string | null;
  };

  title: string;

  titleEnglish?: string | null;
  titleJapanese?: string | null;

  titleSynonyms?: string[];

  type?: string | null;

  chapters?: number | null;
  volumes?: number | null;

  status?: string | null;
  publishing?: boolean;

  published?: {
    from?: string | null;
    to?: string | null;
    string?: string | null;
  };

  score?: number | null;
  scoredBy?: number | null;

  synopsis?: string | null;

  authors?: JikanEdgeNamedResource[];

  serializations?: JikanEdgeNamedResource[];

  genres?: JikanEdgeNamedResource[];

  demographics?: JikanEdgeNamedResource[];
}

interface JikanEdgeDetailsResponse {
  data: JikanEdgeMangaDetails;

  meta: {
    cached?: boolean;
    stale?: boolean;
    refreshFailed?: boolean;
    fetchedAt?: string;
  };
}

function getDate(value: string | null | undefined): string | null {
  // Normaliza timestamps e datas parciais para o formato usado pelo domínio.
  if (!value) {
    return null;
  }

  return value.slice(0, 10);
}

function isInsideWindow(date: string, window: MangaSearchWindow): boolean {
  // A comparação inclusiva mantém obras lançadas exatamente nos limites da janela.
  return date >= window.startDate && date <= window.endDate;
}

function mapJikanEdgeManga(
  item: JikanEdgeManga,
  window: MangaSearchWindow,
): MangaCandidate | null {
  // Aplica a validação local porque a API pode retornar itens fora do filtro solicitado.
  const startDate = getDate(item.published?.from);

  /*
   * Isto é especialmente importante
   * no jikan-edge.
   *
   * O próprio projeto documenta que
   * entradas sem data conhecida podem
   * aparecer mesmo com filtros de data.
   */
  if (!startDate || !isInsideWindow(startDate, window)) {
    return null;
  }

  if (item.type && item.type.toLowerCase() !== 'manga') {
    return null;
  }

  return {
    malId: item.malId,

    title: item.title,

    titleEnglish: item.titleEnglish ?? null,

    titleJapanese: item.titleJapanese ?? null,

    type: item.type ?? null,

    status: item.status ?? (item.publishing ? 'Publishing' : null),

    startDate,

    url: item.url ?? `https://myanimelist.net/manga/${item.malId}`,

    imageUrl: item.imageUrl ?? null,
  };
}

function mapEdgeNamedResource(
  item: JikanEdgeNamedResource,
): MangaNamedResource {
  // Adapta recursos com camelCase do jikan-edge para o modelo compartilhado.
  return {
    malId: item.malId,
    name: item.name,
    url: item.url ?? null,
  };
}

function mapJikanEdgeDetails(item: JikanEdgeMangaDetails): MangaDetails {
  // Garante que o fallback produza o mesmo formato de detalhes do provider principal.
  const startDate = getDate(item.published?.from);

  if (!startDate) {
    throw new Error(`jikan-edge: mangá ${item.malId} sem data de início.`);
  }

  return {
    malId: item.malId,

    title: item.title,

    titleEnglish: item.titleEnglish ?? null,

    titleJapanese: item.titleJapanese ?? null,

    titleSynonyms: item.titleSynonyms ?? [],

    type: item.type ?? null,

    status: item.status ?? (item.publishing ? 'Publishing' : null),

    startDate,

    chapters: item.chapters ?? null,

    volumes: item.volumes ?? null,

    score: item.score && item.score > 0 ? item.score : null,

    scoredBy: item.scoredBy ?? null,

    synopsis: item.synopsis?.trim() || null,

    authors: item.authors?.map(mapEdgeNamedResource) ?? [],

    serializations: item.serializations?.map(mapEdgeNamedResource) ?? [],

    genres: item.genres?.map(mapEdgeNamedResource) ?? [],

    demographics: item.demographics?.map(mapEdgeNamedResource) ?? [],

    url: item.url ?? `https://myanimelist.net/manga/${item.malId}`,

    imageUrl:
      item.images?.large ?? item.images?.medium ?? item.imageUrl ?? null,
  };
}

export class JikanEdgeMangaProvider implements MangaProvider {
  // Provider alternativo usado quando Tenrai falha ou está indisponível.
  readonly name = 'jikan-edge';

  async getMangaDetails(malId: number): Promise<MangaDetails> {
    const url = new URL(`${JIKAN_EDGE_BASE_URL}/manga/${malId}/full`);

    console.log(`📖 jikan-edge: buscando detalhes do mangá ${malId}...`);

    const response = await fetchJsonWithRetry<JikanEdgeDetailsResponse>(
      url,
      this.name,
    );

    if (response.meta.stale) {
      console.warn(
        `⚠️ jikan-edge retornou detalhes em cache stale para ${malId}.`,
      );
    }

    return mapJikanEdgeDetails(response.data);
  }

  async getRecentlyStartedManga(
    window: MangaSearchWindow,
  ): Promise<MangaCandidate[]> {
    // Percorre as páginas disponíveis e remove duplicidades antes do retorno.
    const manga: MangaCandidate[] = [];

    let page = 1;
    let hasNextPage = true;

    while (hasNextPage) {
      const url = new URL(`${JIKAN_EDGE_BASE_URL}/manga`);

      url.searchParams.set('type', 'manga');

      url.searchParams.set('status', 'publishing');

      url.searchParams.set('start_date', window.startDate);

      url.searchParams.set('order_by', 'start_date');

      url.searchParams.set('sort', 'desc');

      url.searchParams.set('page', String(page));

      /*
       * NÃO adicionamos:
       *
       * limit
       * sfw
       *
       * O jikan-edge não aceita esses
       * parâmetros nesta rota.
       */

      console.log(`📡 jikan-edge: buscando página ${page}...`);

      const response = await fetchJsonWithRetry<JikanEdgeResponse>(
        url,
        this.name,
      );

      for (const item of response.data) {
        const mapped = mapJikanEdgeManga(item, window);

        if (mapped) {
          manga.push(mapped);
        }
      }

      if (response.meta.stale) {
        console.warn('⚠️ jikan-edge retornou dados em cache stale.');
      }

      hasNextPage = response.meta.pagination?.hasNextPage ?? false;

      page++;

      if (page > 1000) {
        break;
      }
    }

    return Array.from(
      new Map(manga.map((item) => [item.malId, item])).values(),
    );
  }
}
