import { env } from '../config/env.js';
import { sleep } from '../utils/sleep.js';

// URL base da API do TMDB para montar as rotas de requisição.
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Representa um filme retornado pela API de listagem de filmes.
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

// Estrutura da resposta da API ao listar filmes em uma página.
interface TmdbMovieResponse {
  page: number;
  results: TmdbMovie[];
  total_pages: number;
  total_results: number;
}

// Estrutura de um gênero de filme vindo da API.
export interface TmdbGenre {
  id: number;
  name: string;
}

// Estrutura de um vídeo relacionado ao filme, como trailer ou teaser.
export interface TmdbVideo {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  official: boolean;
}

// Estrutura da resposta da API de vídeos do filme.
interface TmdbVideosResponse {
  id: number;
  results: TmdbVideo[];
}

// Dados detalhados de um filme, usados quando precisamos mais informações.
export interface TmdbMovieDetails {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  release_date: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  vote_count: number;
  runtime: number | null;
  genres: TmdbGenre[];
}

// Faz a requisição com tentativa de recuperação por falha temporária.
// Isso ajuda quando a API responde 429 (muitas requisições) ou erro do servidor.
async function fetchWithRetry(url: URL, attempts = 3): Promise<Response> {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      // Envia a requisição para o TMDB com autenticação por token e timeout.
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${env.tmdbAccessToken}`,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(15_000),
      });

      // Se a API indicar rate limit ou erro interno, trata como falha temporária.
      if (response.status === 429 || response.status >= 500) {
        throw new Error(
          `TMDB temporariamente indisponível: ${response.status}`,
        );
      }

      return response;
    } catch (error) {
      console.warn(`⚠️ Falha ao consultar TMDB (${attempt}/${attempts})`);

      // Se já foi a última tentativa, repassa a falha para o chamador.
      if (attempt === attempts) {
        throw error;
      }

      // Intervalo cresce conforme a tentativa aumenta.
      const delay = attempt * 2000;

      console.log(`🔄 Nova tentativa em ${delay / 1000}s...`);

      await sleep(delay);
    }
  }

  throw new Error('Não foi possível acessar o TMDB.');
}

// Busca filmes em cartaz/lançamento no Brasil dentro de um intervalo de datas.
export async function getBrazilTheatricalReleases(
  startDate: string,
  endDate: string,
): Promise<TmdbMovie[]> {
  // Cria a URL da rota de descoberta de filmes.
  const url = new URL(`${TMDB_BASE_URL}/discover/movie`);

  // Filtro para obter filmes no idioma português e na região Brasil.
  url.searchParams.set('language', 'pt-BR');
  url.searchParams.set('region', 'BR');
  url.searchParams.set('with_release_type', '3|2');

  // Limita a busca ao período de datas solicitado.
  url.searchParams.set('release_date.gte', startDate);
  url.searchParams.set('release_date.lte', endDate);

  // Configurações adicionais para evitar resultados inadequados e ordenar por popularidade.
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

  // Retorna apenas a lista de resultados da página solicitada.
  return data.results;
}

// Busca detalhes completos de um filme específico pelo ID.
export async function getMovieDetails(
  movieId: number,
): Promise<TmdbMovieDetails> {
  const url = new URL(`${TMDB_BASE_URL}/movie/${movieId}`);

  // Pede os dados em português para exibição amigável ao usuário.
  url.searchParams.set('language', 'pt-BR');

  const response = await fetchWithRetry(url);

  if (!response.ok) {
    throw new Error(
      `Erro ao buscar detalhes do filme ${movieId}: ` +
        `${response.status} ${response.statusText}`,
    );
  }

  return (await response.json()) as TmdbMovieDetails;
}

// Busca os vídeos de um filme (como trailer) em um idioma específico.
async function getMovieVideos(
  movieId: number,
  language: string,
): Promise<TmdbVideo[]> {
  const url = new URL(`${TMDB_BASE_URL}/movie/${movieId}/videos`);

  // Define o idioma da busca do vídeo, quando disponível.
  url.searchParams.set('language', language);

  const response = await fetchWithRetry(url);

  if (!response.ok) {
    throw new Error(
      `Erro ao buscar vídeos do filme ${movieId}: ` +
        `${response.status} ${response.statusText}`,
    );
  }

  const data = (await response.json()) as TmdbVideosResponse;

  // Garante que sempre retorne um array, mesmo quando não houver vídeos.
  return data.results ?? [];
}

// Verifica se existe algum trailer disponível no YouTube.
function hasYouTubeTrailer(videos: TmdbVideo[]): boolean {
  return videos.some(
    (video) => video.site === 'YouTube' && video.type === 'Trailer',
  );
}

// Busca trailers em português primeiro e, se não achar, tenta em inglês.
export async function getMovieVideosWithFallback(
  movieId: number,
): Promise<TmdbVideo[]> {
  // Tenta recuperar os vídeos em português primeiro.
  const portugueseVideos = await getMovieVideos(movieId, 'pt-BR');

  // Se existe trailer em português, usa essa lista e não faz busca extra.
  if (hasYouTubeTrailer(portugueseVideos)) {
    return portugueseVideos;
  }

  console.log('🇧🇷 Trailer em português não encontrado. Buscando em inglês...');

  // Como fallback, busca em inglês para aumentar a chance de encontrar o trailer.
  const englishVideos = await getMovieVideos(movieId, 'en-US');

  // Junta os vídeos em português e inglês para manter a lista completa.
  return [...portugueseVideos, ...englishVideos];
}
