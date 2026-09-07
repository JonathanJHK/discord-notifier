import { describe, expect, it } from 'vitest';

import { mapMovieDetails } from '../src/movies/movie.mapper.js';

import type {
  TmdbMovieDetails,
  TmdbVideo,
} from '../src/movies/tmdb.service.js';

const movie: TmdbMovieDetails = {
  id: 123,
  title: 'Filme Teste',
  original_title: 'Test Movie',
  overview: 'Uma sinopse de teste.',
  release_date: '2026-09-01',
  poster_path: '/poster.jpg',
  backdrop_path: '/backdrop.jpg',
  vote_average: 8.5,
  vote_count: 100,
  runtime: 120,
  genres: [
    {
      id: 28,
      name: 'Ação',
    },
  ],
};

describe('mapMovieDetails', () => {
  it('deve mapear corretamente os dados do filme', () => {
    const result = mapMovieDetails(movie, '2026-09-07');

    expect(result.id).toBe(123);
    expect(result.title).toBe('Filme Teste');

    expect(result.originalTitle).toBe('Test Movie');

    /*
     * Deve usar a data regional que veio
     * da busca brasileira, e não a data
     * genérica dos detalhes.
     */
    expect(result.releaseDate).toBe('2026-09-07');

    expect(result.genres).toEqual(['Ação']);

    expect(result.runtime).toBe(120);
    expect(result.rating).toBe(8.5);

    expect(result.posterUrl).toBe('https://image.tmdb.org/t/p/w500/poster.jpg');

    expect(result.backdropUrl).toBe(
      'https://image.tmdb.org/t/p/w1280/backdrop.jpg',
    );

    expect(result.tmdbUrl).toBe('https://www.themoviedb.org/movie/123');
  });

  it('deve priorizar trailer oficial do YouTube', () => {
    const videos: TmdbVideo[] = [
      {
        id: '1',
        key: 'nao-oficial',
        name: 'Trailer',
        site: 'YouTube',
        type: 'Trailer',
        official: false,
      },
      {
        id: '2',
        key: 'oficial',
        name: 'Official Trailer',
        site: 'YouTube',
        type: 'Trailer',
        official: true,
      },
    ];

    const result = mapMovieDetails(movie, '2026-09-07', videos);

    expect(result.trailerUrl).toBe('https://www.youtube.com/watch?v=oficial');
  });

  it('deve usar fallbacks quando dados opcionais estiverem ausentes', () => {
    const incompleteMovie: TmdbMovieDetails = {
      ...movie,

      overview: '',
      poster_path: null,
      backdrop_path: null,
      runtime: null,
      genres: [],
    };

    const result = mapMovieDetails(incompleteMovie, '2026-09-07', []);

    expect(result.overview).toBe('Sinopse não disponível em português.');

    expect(result.posterUrl).toBeNull();
    expect(result.backdropUrl).toBeNull();
    expect(result.trailerUrl).toBeNull();
    expect(result.runtime).toBeNull();
    expect(result.genres).toEqual([]);
  });
});
