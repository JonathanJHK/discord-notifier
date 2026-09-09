import type { MovieNotification } from './movie.mapper.js';

// Converte a data no formato ISO para uma visualização amigável no Brasil.
function formatDate(date: string): string {
  // Converte a data ISO do TMDB para o formato brasileiro exibido no Discord.
  const [year, month, day] = date.split('-');

  return `${day}/${month}/${year}`;
}

// Formata a duração em horas e minutos para exibição no embed.
function formatRuntime(runtime: number | null): string {
  // Divide minutos em horas somente para melhorar a leitura da duração.
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

// Limita o texto da sinopse para evitar embeds muito longos no Discord.
function truncate(text: string, maxLength: number): string {
  // Evita ultrapassar o tamanho de descrição suportado pelo embed.
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 3)}...`;
}

// Cria o payload de embed do Discord com as informações do filme.
export function createMovieEmbed(movie: MovieNotification) {
  // Monta exclusivamente a apresentação do filme, sem alterar os dados mapeados.
  // Concatena os gêneros para uma linha só, ou indica ausência.
  const genres =
    movie.genres.length > 0 ? movie.genres.join(' • ') : 'Não informado';

  // Mostra nota formatada em 1 decimal quando houver avaliação.
  const rating =
    movie.rating > 0 ? `${movie.rating.toFixed(1)}/10` : 'Sem avaliações';

  // Campos visuais do embed: data, nota, duração e gêneros.
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

  // Adiciona link de trailer no embed quando existir.
  if (movie.trailerUrl) {
    fields.push({
      name: '🎞️  Trailer',
      value: `**[Assistir no YouTube ↗](${movie.trailerUrl})**`,
      inline: false,
    });
  }

  return {
    author: {
      name: '🍿 NOVA ESTREIA NOS CINEMAS',
    },

    title: `🎬 ${movie.title}`,
    url: movie.tmdbUrl,

    description:
      `${truncate(
        movie.overview || 'Sinopse não disponível em português.',
        1100,
      )}\n\n` + '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n',
    // Vermelho moderno semelhante ao visual da referência.
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
