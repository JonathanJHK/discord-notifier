import type { TmdbMovieDetails, TmdbVideo } from './tmdb.service.js';

// Base usada para montar URLs de imagens do TMDB.
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

// Estrutura final que será usada para criar o embed do Discord.
export interface MovieNotification {
  id: number;
  title: string;
  originalTitle: string;
  overview: string;
  releaseDate: string;
  genres: string[];
  runtime: number | null;
  rating: number;

  posterUrl: string | null;
  backdropUrl: string | null;
  trailerUrl: string | null;
  tmdbUrl: string;
}

// Procura o melhor trailer disponível: preferencialmente oficial e do YouTube.
function findTrailer(videos: TmdbVideo[] = []): TmdbVideo | undefined {
  const officialTrailer = videos.find(
    (video) =>
      video.site === 'YouTube' && video.type === 'Trailer' && video.official,
  );

  if (officialTrailer) {
    return officialTrailer;
  }

  return videos.find(
    (video) => video.site === 'YouTube' && video.type === 'Trailer',
  );
}

// Converte os dados brutos do TMDB em um formato pronto para o bot exibir.
export function mapMovieDetails(
  movie: TmdbMovieDetails,
  brazilReleaseDate: string,
  videos: TmdbVideo[] = [],
): MovieNotification {
  const trailer = findTrailer(videos);

  return {
    id: movie.id,
    title: movie.title,
    originalTitle: movie.original_title,
    overview: movie.overview || 'Sinopse não disponível em português.',
    releaseDate: brazilReleaseDate,
    genres: movie.genres?.map((genre) => genre.name) ?? [],
    runtime: movie.runtime,
    rating: movie.vote_average,
    posterUrl: movie.poster_path
      ? `${TMDB_IMAGE_BASE_URL}/w500${movie.poster_path}`
      : null,
    backdropUrl: movie.backdrop_path
      ? `${TMDB_IMAGE_BASE_URL}/w1280${movie.backdrop_path}`
      : null,
    trailerUrl: trailer
      ? `https://www.youtube.com/watch?v=${trailer.key}`
      : null,
    tmdbUrl: `https://www.themoviedb.org/movie/${movie.id}`,
  };
}
