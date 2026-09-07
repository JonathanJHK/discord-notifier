import { sleep } from '../utils/sleep.js';

// Endpoint GraphQL do AniList usado para consultar agendamentos de episódios.
const ANILIST_API_URL = 'https://graphql.anilist.co';

// Campos de título retornados pela API do AniList.
export interface AniListTitle {
  romaji: string | null;
  english: string | null;
  native: string | null;
}

export interface AniListCoverImage {
  extraLarge: string | null;
  large: string | null;
  color: string | null;
}

export interface AniListMedia {
  id: number;
  idMal: number | null;

  title: AniListTitle;

  description: string | null;
  genres: string[];

  format: string | null;
  episodes: number | null;
  duration: number | null;

  averageScore: number | null;

  coverImage: AniListCoverImage;
  bannerImage: string | null;

  siteUrl: string;

  isAdult: boolean;
}

export interface AniListAiringSchedule {
  id: number;
  airingAt: number;
  episode: number;
  mediaId: number;
  media: AniListMedia;
}

interface AniListResponse {
  data?: {
    Page: {
      pageInfo: {
        hasNextPage: boolean;
      };

      airingSchedules: AniListAiringSchedule[];
    };
  };

  errors?: {
    message: string;
  }[];
}

// Query GraphQL responsável por buscar agendamentos de episódios em um intervalo de tempo.
const query = `
  query (
    $page: Int,
    $start: Int,
    $end: Int
  ) {
    Page(
      page: $page,
      perPage: 50
    ) {
      pageInfo {
        hasNextPage
      }

      airingSchedules(
        airingAt_greater: $start,
        airingAt_lesser: $end,
        sort: TIME
      ) {
        id
        airingAt
        episode
        mediaId

        media {
          id
          idMal

          title {
            romaji
            english
            native
          }

          description(asHtml: false)

          genres
          format
          episodes
          duration
          averageScore

          coverImage {
            extraLarge
            large
            color
          }

          bannerImage
          siteUrl
          isAdult
        }
      }
    }
  }
`;

// Faz a requisição ao endpoint do AniList com retries e timeout para reduzir falhas temporárias.
async function requestAniList(
  start: number,
  end: number,
  page: number,
): Promise<AniListResponse> {
  const attempts = 5;

  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(ANILIST_API_URL, {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },

        body: JSON.stringify({
          query,
          variables: {
            page,
            start,
            end,
          },
        }),

        signal: AbortSignal.timeout(15_000),
      });

      const responseBody = await response.text();

      if (!response.ok) {
        console.error(`AniList respondeu ${response.status}: ${responseBody}`);

        // 403 não é um erro que vale a pena repetir imediatamente
        if (response.status === 403) {
          throw new Error(
            `AniList indisponível ou acesso temporariamente bloqueado: 403`,
          );
        }

        // 400/401 normalmente são erro de configuração/query
        if (
          response.status >= 400 &&
          response.status < 500 &&
          response.status !== 429
        ) {
          throw new Error(
            `Erro AniList: ${response.status} ${response.statusText}`,
          );
        }

        // 429 e 5xx podem ser temporários
        throw new Error(
          `AniList temporariamente indisponível: ${response.status}`,
        );
      }

      return JSON.parse(responseBody) as AniListResponse;
    } catch (error) {
      lastError = error;

      const message = error instanceof Error ? error.message : String(error);

      // Não repetir 403
      if (message.includes('403')) {
        throw error;
      }

      if (attempt === attempts) {
        break;
      }

      const delay =
        2000 * 2 ** (attempt - 1) + Math.floor(Math.random() * 1000);

      console.warn(`⚠️ Falha no AniList (${attempt}/${attempts}).`);

      console.log(
        `🔄 Nova tentativa em aproximadamente ${Math.round(delay / 1000)}s...`,
      );

      await sleep(delay);
    }
  }

  throw lastError ?? new Error('Falha ao acessar AniList.');
}

// Busca todos os episódios que foram ao ar dentro do intervalo informado, ignorando conteúdo adulto.
export async function getAiredEpisodes(
  start: number,
  end: number,
): Promise<AniListAiringSchedule[]> {
  const schedules: AniListAiringSchedule[] = [];

  let page = 1;
  let hasNextPage = true;

  while (hasNextPage) {
    const response = await requestAniList(start, end, page);

    if (response.errors?.length) {
      throw new Error(response.errors.map((error) => error.message).join(', '));
    }

    if (!response.data) {
      throw new Error('AniList retornou uma resposta sem dados.');
    }

    schedules.push(...response.data.Page.airingSchedules);

    hasNextPage = response.data.Page.pageInfo.hasNextPage;

    page++;
  }

  return schedules.filter((schedule) => !schedule.media.isAdult);
}
