import type { MovieNotification } from './movie.mapper.js';

function formatDate(date: string): string {
  const [year, month, day] = date.split('-');

  return `${day}/${month}/${year}`;
}

function formatRuntime(runtime: number | null): string {
  if (!runtime) {
    return 'Não informado';
  }

  const hours = Math.floor(runtime / 60);
  const minutes = runtime % 60;

  if (hours === 0) {
    return `${minutes}min`;
  }

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}min`;
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 3)}...`;
}

export function createMovieEmbed(movie: MovieNotification) {
  const genres =
    movie.genres.length > 0 ? movie.genres.join(' • ') : 'Não informado';

  const rating =
    movie.rating > 0 ? `${movie.rating.toFixed(1)}/10` : 'Sem avaliações';

  const fields = [
    {
      name: '📅  Estreia no Brasil',
      value: `**${formatDate(movie.releaseDate)}**`,
      inline: true,
    },
    {
      name: '⭐  Nota TMDB',
      value: `**${rating}**`,
      inline: true,
    },
    {
      name: '⏱️  Duração',
      value: `**${formatRuntime(movie.runtime)}**`,
      inline: true,
    },

    {
      name: '🎭  Gêneros',
      value: genres,
      inline: false,
    },
  ];

  if (movie.trailerUrl) {
    fields.push({
      name: '🎞️  Trailer',
      value: `**[Assistir no YouTube ↗](${movie.trailerUrl})**`,
      inline: false,
    });
  }

  return {
    title: `🎬 ${movie.title}`,

    url: movie.tmdbUrl,

    description: truncate(
      movie.overview || 'Sinopse não disponível em português.',
      1100,
    ),

    // Vermelho moderno parecido com a referência
    color: 0xff3344,

    fields,

    thumbnail: movie.posterUrl
      ? {
          url: movie.posterUrl,
        }
      : undefined,

    footer: {
      text: '🍿  COREIA DO LEO É CINEMA  •  Dados fornecidos pelo TMDB',
    },
  };
}
