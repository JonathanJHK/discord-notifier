import { env } from '../config/env.js';

const ANIME_SCHEDULE_BASE_URL = 'https://animeschedule.net/api/v3';

const ANIME_SCHEDULE_IMAGE_BASE_URL =
  'https://img.animeschedule.net/production/assets/public/img/';

export interface AnimeScheduleCategory {
  name: string;
  route: string;
}

export interface AnimeScheduleStream {
  platform: string;
  url: string;
  name: string;
}

export interface AnimeScheduleTimetable {
  title: string;
  route: string;

  romaji?: string;
  english?: string;
  native?: string;

  status: string;

  episodeDate: string;
  episodeNumber: number;
  subtractedEpisodeNumber?: number;

  episodes: number;
  lengthMin: number;

  donghua: boolean;

  airType: 'raw' | 'sub' | 'dub';

  mediaTypes: AnimeScheduleCategory[];

  imageVersionRoute?: string;

  streams?: AnimeScheduleStream[];

  airingStatus: 'airing' | 'aired' | 'unaired' | 'delayed-air';
}

export interface AnimeScheduleGenre {
  name: string;
  route: string;
}

export interface AnimeScheduleNames {
  romaji?: string;
  english?: string;
  native?: string;
}

export interface AnimeScheduleStats {
  averageScore?: number;
  ratingCount?: number;
}

export interface AnimeScheduleWebsites {
  official?: string;
  mal?: string;
  aniList?: string;
  kitsu?: string;
  animePlanet?: string;
  anidb?: string;
}

export interface AnimeScheduleDetails {
  id: string;
  title: string;
  route: string;

  description?: string;

  names?: AnimeScheduleNames;

  genres?: AnimeScheduleGenre[];

  episodes?: number;
  lengthMin?: number;

  stats?: AnimeScheduleStats;

  websites?: AnimeScheduleWebsites;

  imageVersionRoute?: string;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: URL, attempts = 5): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${env.animeScheduleToken}`,

          Accept: 'application/json',
        },

        signal: AbortSignal.timeout(15_000),
      });

      /*
       * Erros de autenticação/configuração:
       * não adianta tentar várias vezes.
       */
      if (response.status === 401 || response.status === 403) {
        const body = await response.text();

        throw new Error(
          `AnimeSchedule: ${response.status} ` +
            `${response.statusText}\n${body}`,
        );
      }

      /*
       * 429 ou erros do servidor podem
       * ser temporários.
       */
      if (response.status === 429 || response.status >= 500) {
        throw new Error(
          `AnimeSchedule temporariamente indisponível: ` + `${response.status}`,
        );
      }

      return response;
    } catch (error) {
      lastError = error;

      const message = error instanceof Error ? error.message : String(error);

      if (message.includes('401') || message.includes('403')) {
        throw error;
      }

      if (attempt === attempts) {
        break;
      }

      const delay =
        2000 * 2 ** (attempt - 1) + Math.floor(Math.random() * 1000);

      console.warn(`⚠️ Falha no AnimeSchedule ` + `(${attempt}/${attempts}).`);

      console.log(
        `🔄 Nova tentativa em aproximadamente ` +
          `${Math.round(delay / 1000)}s...`,
      );

      await sleep(delay);
    }
  }

  throw lastError ?? new Error('Falha ao consultar AnimeSchedule.');
}

export async function getSubTimetable(): Promise<AnimeScheduleTimetable[]> {
  const url = new URL(`${ANIME_SCHEDULE_BASE_URL}/timetables/sub`);

  url.searchParams.set('tz', 'America/Sao_Paulo');

  const response = await fetchWithRetry(url);

  if (!response.ok) {
    const body = await response.text();

    throw new Error(
      `Erro ao consultar AnimeSchedule: ` +
        `${response.status} ${response.statusText}\n` +
        body,
    );
  }

  const data = (await response.json()) as AnimeScheduleTimetable[];

  /*
   * A documentação diz que o timetable "sub"
   * pode usar RAW quando não houver horário
   * de legenda disponível.
   *
   * Como queremos notificar efetivamente
   * episódios legendados, mantemos apenas SUB.
   */
  return data.filter((anime) => anime.airType === 'sub');
}

export function getAnimeImageUrl(imageVersionRoute?: string): string | null {
  if (!imageVersionRoute) {
    return null;
  }

  return ANIME_SCHEDULE_IMAGE_BASE_URL + imageVersionRoute;
}

export async function getAnimeDetails(
  route: string,
): Promise<AnimeScheduleDetails> {
  const url = new URL(`${ANIME_SCHEDULE_BASE_URL}/anime/${route}`);

  const response = await fetchWithRetry(url);

  if (!response.ok) {
    const body = await response.text();

    throw new Error(
      `Erro ao buscar anime ${route}: ` +
        `${response.status} ${response.statusText}\n` +
        body,
    );
  }

  return (await response.json()) as AnimeScheduleDetails;
}
