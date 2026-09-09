import { fetchJsonWithRetry } from './provider-http.js';

import type {
  MangaCandidate,
  MangaDetails,
  MangaNamedResource,
  MangaProvider,
  MangaSearchWindow,
} from './manga-provider.js';

const TENRAI_BASE_URL = 'https://api.tenrai.org/v1';

interface TenraiImageSet {
  image_url?: string | null;
  small_image_url?: string | null;
  large_image_url?: string | null;
}

interface TenraiManga {
  mal_id: number;

  url?: string | null;

  images?: {
    jpg?: TenraiImageSet;
    webp?: TenraiImageSet;
  };

  title: string;

  title_english?: string | null;
  title_japanese?: string | null;

  type?: string | null;

  status?: string | null;
  publishing?: boolean;

  published?: {
    from?: string | null;
    to?: string | null;
    string?: string | null;
  };
}

interface TenraiResponse {
  pagination: {
    last_visible_page: number;
    has_next_page: boolean;
    current_page: number;
  };

  data: TenraiManga[];
}

interface TenraiNamedResource {
  mal_id: number;
  type?: string;
  name: string;
  url?: string | null;
}

interface TenraiMangaDetails {
  mal_id: number;

  url?: string | null;

  images?: {
    jpg?: TenraiImageSet;
    webp?: TenraiImageSet;
  };

  title: string;

  title_english?: string | null;
  title_japanese?: string | null;

  title_synonyms?: string[];

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
  scored_by?: number | null;

  synopsis?: string | null;

  authors?: TenraiNamedResource[];

  serializations?: TenraiNamedResource[];

  genres?: TenraiNamedResource[];

  demographics?: TenraiNamedResource[];
}

interface TenraiDetailsResponse {
  data: TenraiMangaDetails;
}

function getDate(value: string | null | undefined): string | null {
  // Os endpoints retornam timestamps; somente a data é relevante para a janela de descoberta.
  if (!value) {
    return null;
  }

  return value.slice(0, 10);
}

function isInsideWindow(date: string, window: MangaSearchWindow): boolean {
  // Datas ISO podem ser comparadas lexicograficamente quando têm o mesmo formato.
  return date >= window.startDate && date <= window.endDate;
}

function mapNamedResource(item: TenraiNamedResource): MangaNamedResource {
  // Converte o nome de recurso do formato Tenrai para o contrato interno.
  return {
    malId: item.mal_id,
    name: item.name,
    url: item.url ?? null,
  };
}

function mapTenraiManga(
  item: TenraiManga,
  window: MangaSearchWindow,
): MangaCandidate | null {
  // Filtra e normaliza cada item antes de incluí-lo na lista de candidatos.
  const startDate = getDate(item.published?.from);

  /*
   * Validação local obrigatória.
   * Não confiamos exclusivamente
   * no filtro da API.
   */
  if (!startDate || !isInsideWindow(startDate, window)) {
    return null;
  }

  /*
   * Queremos somente Manga.
   *
   * Exclui:
   * novel
   * light novel
   * one-shot
   * doujin
   * manhwa
   * manhua
   */
  if (item.type && item.type.toLowerCase() !== 'manga') {
    return null;
  }

  return {
    malId: item.mal_id,

    title: item.title,

    titleEnglish: item.title_english ?? null,

    titleJapanese: item.title_japanese ?? null,

    type: item.type ?? null,

    status: item.status ?? null,

    startDate,

    url: item.url ?? `https://myanimelist.net/manga/${item.mal_id}`,

    imageUrl:
      item.images?.jpg?.large_image_url ??
      item.images?.jpg?.image_url ??
      item.images?.webp?.large_image_url ??
      null,
  };
}

function mapTenraiDetails(item: TenraiMangaDetails): MangaDetails {
  // Converte a resposta detalhada e rejeita obras sem data utilizável.
  const startDate = getDate(item.published?.from);

  if (!startDate) {
    throw new Error(`Tenrai: mangá ${item.mal_id} sem data de início.`);
  }

  return {
    malId: item.mal_id,

    title: item.title,

    titleEnglish: item.title_english ?? null,

    titleJapanese: item.title_japanese ?? null,

    titleSynonyms: item.title_synonyms ?? [],

    type: item.type ?? null,

    status: item.status ?? null,

    startDate,

    chapters: item.chapters ?? null,

    volumes: item.volumes ?? null,

    score: item.score && item.score > 0 ? item.score : null,

    scoredBy: item.scored_by ?? null,

    synopsis: item.synopsis?.trim() || null,

    authors: item.authors?.map(mapNamedResource) ?? [],

    serializations: item.serializations?.map(mapNamedResource) ?? [],

    genres: item.genres?.map(mapNamedResource) ?? [],

    demographics: item.demographics?.map(mapNamedResource) ?? [],

    url: item.url ?? `https://myanimelist.net/manga/${item.mal_id}`,

    imageUrl:
      item.images?.jpg?.large_image_url ??
      item.images?.jpg?.image_url ??
      item.images?.webp?.large_image_url ??
      item.images?.webp?.image_url ??
      null,
  };
}

export class TenraiMangaProvider implements MangaProvider {
  // Provider baseado na API Tenrai, compatível com o contrato comum de mangá.
  readonly name = 'Tenrai';

  async getMangaDetails(malId: number): Promise<MangaDetails> {
    const url = new URL(`${TENRAI_BASE_URL}/manga/${malId}/full`);

    url.searchParams.set('sfw', 'true');

    console.log(`📖 Tenrai: buscando detalhes do mangá ${malId}...`);

    const response = await fetchJsonWithRetry<TenraiDetailsResponse>(
      url,
      this.name,
    );

    return mapTenraiDetails(response.data);
  }

  async getRecentlyStartedManga(
    window: MangaSearchWindow,
  ): Promise<MangaCandidate[]> {
    // Pagina todos os resultados e deduplica por MAL ID antes de devolver a lista.
    const manga: MangaCandidate[] = [];

    let page = 1;
    let hasNextPage = true;

    while (hasNextPage) {
      const url = new URL(`${TENRAI_BASE_URL}/manga`);

      url.searchParams.set('type', 'manga');

      url.searchParams.set('status', 'publishing');

      url.searchParams.set('start_date', window.startDate);

      url.searchParams.set('order_by', 'start_date');

      url.searchParams.set('sort', 'desc');

      url.searchParams.set('limit', '50');

      url.searchParams.set('page', String(page));

      url.searchParams.set('sfw', 'true');

      console.log(`📡 Tenrai: buscando página ${page}...`);

      const response = await fetchJsonWithRetry<TenraiResponse>(url, this.name);

      for (const item of response.data) {
        const mapped = mapTenraiManga(item, window);

        if (mapped) {
          manga.push(mapped);
        }
      }

      hasNextPage = response.pagination.has_next_page;

      page++;

      /*
       * Proteção extra caso a API
       * retorne paginação inconsistente.
       */
      if (page > 1000) {
        break;
      }
    }

    return Array.from(
      new Map(manga.map((item) => [item.malId, item])).values(),
    );
  }
}
