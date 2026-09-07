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

// Le o cabeçalho Retry-After do TMDB para respeitar o tempo de espera recomendado pelo servidor.
function getRetryAfterMs(response: Response): number {
  const retryAfter = response.headers.get('retry-after');

  if (!retryAfter) {
    return 5000;
  }

  const seconds = Number(retryAfter);

  if (!Number.isFinite(seconds)) {
    return 5000;
  }

  return Math.ceil(seconds * 1000);
}

// Faz a requisição à API do TMDB com tentativas extras para tolerar falhas temporárias, rate limit e timeouts.
async function fetchWithRetry(url: URL, attempts = 5): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      // Realiza a chamada HTTP autenticada para a API do TMDB.
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${env.tmdbAccessToken}`,

          Accept: 'application/json',
        },

        signal: AbortSignal.timeout(15_000),
      });

      // Se a requisição foi bem sucedida, devolve a resposta imediatamente.
      if (response.ok) {
        return response;
      }

      // Se o servidor respondeu 429, significa que o limite de requisições foi atingido; nesse caso, espera o tempo pedido pelo servidor.
      if (response.status === 429) {
        const retryAfter = getRetryAfterMs(response);

        console.warn('⚠️ TMDB aplicou rate limit.');

        if (attempt === attempts) {
          throw new Error('Limite de requisições do TMDB atingido.');
        }

        console.log(
          `⏳ Aguardando aproximadamente ` +
            `${Math.ceil(retryAfter / 1000)}s...`,
        );

        await sleep(retryAfter + 250);

        continue;
      }

      // Erros do servidor (5xx) normalmente são temporários e podem ser tentados novamente.
      if (response.status >= 500) {
        throw new Error(
          `TMDB temporariamente indisponível: ` +
            `${response.status} ` +
            `${response.statusText}`,
        );
      }

      // Qualquer erro 4xx que não seja rate limit é considerado permanente para essa chamada.
      const body = await response.text();

      throw new Error(
        `Erro permanente no TMDB: ` +
          `${response.status} ` +
          `${response.statusText}\n` +
          body,
      );
    } catch (error) {
      // Guarda a última falha para relançar no final, caso todas as tentativas falhem.
      lastError = error;

      const message = error instanceof Error ? error.message : String(error);

      // Se o erro foi classificado como permanente, não faz sentido tentar novamente.
      if (message.startsWith('Erro permanente no TMDB')) {
        throw error;
      }

      if (attempt === attempts) {
        break;
      }

      // Backoff exponencial com jitter para evitar colisão de retry entre chamadas simultâneas.
      const baseDelay = 2000 * 2 ** (attempt - 1);

      const jitter = Math.floor(Math.random() * 1000);

      const delay = baseDelay + jitter;

      console.warn(`⚠️ Falha ao consultar TMDB ` + `(${attempt}/${attempts}).`);

      console.log(
        `🔄 Nova tentativa em aproximadamente ` +
          `${Math.round(delay / 1000)}s...`,
      );

      await sleep(delay);
    }
  }

  throw lastError ?? new Error('Não foi possível acessar o TMDB.');
}

// Busca todos os filmes que estreiam no Brasil dentro do intervalo escolhido, cobrindo várias páginas do TMDB.
export async function getBrazilTheatricalReleases(
  startDate: string,
  endDate: string,
): Promise<TmdbMovie[]> {
  // Busca a primeira página para saber quantas páginas existem e quantos resultados há.
  const firstPage = await getBrazilTheatricalReleasePage(startDate, endDate, 1);

  const movies: TmdbMovie[] = [...firstPage.results];

  console.log(
    `📄 TMDB: ${firstPage.total_pages} página(s) ` +
      `e ${firstPage.total_results} resultado(s).`,
  );

  // Se houver apenas uma página, já retorna a lista sem chamadas extras.
  if (firstPage.total_pages <= 1) {
    return movies;
  }

  // Busca as páginas restantes para não perder nenhum lançamento dentro do período.
  for (let page = 2; page <= firstPage.total_pages; page++) {
    console.log(`📄 Buscando página ${page}/${firstPage.total_pages}...`);

    const result = await getBrazilTheatricalReleasePage(
      startDate,
      endDate,
      page,
    );

    movies.push(...result.results);
  }

  // Remove filmes duplicados caso a API repita IDs entre páginas ou filtros.
  const uniqueMovies = Array.from(
    new Map(movies.map((movie) => [movie.id, movie])).values(),
  );

  return uniqueMovies;
}

// Monta uma página específica da busca de lançamentos com os filtros de região, idioma e intervalo de datas.
async function getBrazilTheatricalReleasePage(
  startDate: string,
  endDate: string,
  page: number,
): Promise<TmdbMovieResponse> {
  const url = new URL(`${TMDB_BASE_URL}/discover/movie`);

  url.searchParams.set('language', 'pt-BR');
  url.searchParams.set('region', 'BR');
  url.searchParams.set('with_release_type', '3|2');
  url.searchParams.set('release_date.gte', startDate);
  url.searchParams.set('release_date.lte', endDate);
  url.searchParams.set('include_adult', 'false');
  url.searchParams.set('include_video', 'false');
  url.searchParams.set('sort_by', 'popularity.desc');
  url.searchParams.set('page', String(page));

  const response = await fetchWithRetry(url);

  if (!response.ok) {
    throw new Error(
      `Erro ao consultar TMDB: ` + `${response.status} ${response.statusText}`,
    );
  }

  return (await response.json()) as TmdbMovieResponse;
}

// Busca todas as informações detalhadas de um filme pelo seu identificador no TMDB.
export async function getMovieDetails(
  movieId: number,
): Promise<TmdbMovieDetails> {
  const url = new URL(`${TMDB_BASE_URL}/movie/${movieId}`);

  // Solicita os dados em português para mostrar a sinopse e demais textos de forma natural ao usuário.
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

// Busca os vídeos do filme, como trailer, teaser ou clipes, em um idioma específico.
async function getMovieVideos(
  movieId: number,
  language: string,
): Promise<TmdbVideo[]> {
  const url = new URL(`${TMDB_BASE_URL}/movie/${movieId}/videos`);

  // Define o idioma da busca do vídeo para tentar priorizar trailers em português antes do fallback para inglês.
  url.searchParams.set('language', language);

  const response = await fetchWithRetry(url);

  if (!response.ok) {
    throw new Error(
      `Erro ao buscar vídeos do filme ${movieId}: ` +
        `${response.status} ${response.statusText}`,
    );
  }

  const data = (await response.json()) as TmdbVideosResponse;

  // Garante que sempre retorne um array, mesmo quando a API não trouxer nenhum vídeo.
  return data.results ?? [];
}

// Verifica se existe pelo menos um trailer válido no YouTube para o filme.
function hasYouTubeTrailer(videos: TmdbVideo[]): boolean {
  return videos.some(
    (video) => video.site === 'YouTube' && video.type === 'Trailer',
  );
}

// Tenta localizar o trailer em português primeiro e usa inglês como fallback quando necessário.
export async function getMovieVideosWithFallback(
  movieId: number,
): Promise<TmdbVideo[]> {
  // Primeiro tenta recuperar vídeos em português para respeitar a preferência do público brasileiro.
  const portugueseVideos = await getMovieVideos(movieId, 'pt-BR');

  // Se o filme tiver trailer em português, não precisa fazer outra chamada extra.
  if (hasYouTubeTrailer(portugueseVideos)) {
    return portugueseVideos;
  }

  console.log('🇧🇷 Trailer em português não encontrado. Buscando em inglês...');

  // Como fallback, busca no idioma em inglês para aumentar as chances de encontrar o trailer oficial.
  const englishVideos = await getMovieVideos(movieId, 'en-US');

  // Junta os vídeos em português e inglês para manter a lista completa e melhorar a chance de encontrar um trailer útil.
  return [...portugueseVideos, ...englishVideos];
}
