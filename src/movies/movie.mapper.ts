import type { TmdbMovieDetails, TmdbVideo } from './tmdb.service.js';

const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

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

function findTrailer(videos: TmdbVideo[]): TmdbVideo | undefined {
  // Primeiro tenta trailer oficial do YouTube
  const officialTrailer = videos.find(
    (video) =>
      video.site === 'YouTube' && video.type === 'Trailer' && video.official,
  );

  if (officialTrailer) {
    return officialTrailer;
  }

  // Se não tiver, pega qualquer trailer do YouTube
  return videos.find(
    (video) => video.site === 'YouTube' && video.type === 'Trailer',
  );
}

export function mapMovieDetails(
  movie: TmdbMovieDetails,
  brazilReleaseDate: string,
): MovieNotification {
  const trailer = findTrailer(movie.videos?.results ?? []);

  return {
    id: movie.id,
    title: movie.title,
    originalTitle: movie.original_title,
    overview: movie.overview || 'Sinopse não disponível em português.',
    releaseDate: brazilReleaseDate,
    genres: movie.genres.map((genre) => genre.name),
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
