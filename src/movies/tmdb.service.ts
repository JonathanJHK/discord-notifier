import { env } from '../config/env.js';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export interface TmdbMovie {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  release_date: string;
  poster_path: string | null;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
}

interface TmdbMovieResponse {
  page: number;
  results: TmdbMovie[];
  total_pages: number;
  total_results: number;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: URL, attempts = 3): Promise<Response> {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${env.tmdbAccessToken}`,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(15_000),
      });

      if (response.status === 429 || response.status >= 500) {
        throw new Error(
          `TMDB temporariamente indisponível: ${response.status}`,
        );
      }

      return response;
    } catch (error) {
      console.warn(`⚠️ Falha ao consultar TMDB (${attempt}/${attempts})`);

      if (attempt === attempts) {
        throw error;
      }

      const delay = attempt * 2000;

      console.log(`🔄 Nova tentativa em ${delay / 1000}s...`);

      await sleep(delay);
    }
  }

  throw new Error('Não foi possível acessar o TMDB.');
}

export async function getBrazilTheatricalReleases(
  startDate: string,
  endDate: string,
): Promise<TmdbMovie[]> {
  const url = new URL(`${TMDB_BASE_URL}/discover/movie`);

  url.searchParams.set('language', 'pt-BR');
  url.searchParams.set('region', 'BR');
  url.searchParams.set('with_release_type', '3|2');

  url.searchParams.set('release_date.gte', startDate);
  url.searchParams.set('release_date.lte', endDate);

  url.searchParams.set('include_adult', 'false');
  url.searchParams.set('include_video', 'false');
  url.searchParams.set('sort_by', 'popularity.desc');
  url.searchParams.set('page', '1');

  const response = await fetchWithRetry(url);

  if (!response.ok) {
    throw new Error(
      `Erro ao consultar TMDB: ${response.status} ${response.statusText}`,
    );
  }

  const data = (await response.json()) as TmdbMovieResponse;

  return data.results;
}
