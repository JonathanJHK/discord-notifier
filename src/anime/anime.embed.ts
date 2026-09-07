import type { AnimeNotification } from './anime.mapper.js';

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  return text.slice(0, maxLength - 3) + '...';
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',

    day: '2-digit',
    month: '2-digit',
    year: 'numeric',

    hour: '2-digit',
    minute: '2-digit',
  });
}

export function createAnimeEmbed(anime: AnimeNotification) {
  const fields = [
    {
      name: '📺 Episódio',
      value: `**${anime.episode}**`,
      inline: true,
    },

    {
      name: '🕒 Lançamento',
      value: `**${formatDate(anime.releasedAt)}**`,
      inline: true,
    },

    {
      name: '⏱️ Duração',
      value: anime.duration ? `**${anime.duration} min**` : 'Não informado',
      inline: true,
    },
  ];

  if (anime.score !== null) {
    fields.push({
      name: '⭐ Nota',
      value: `**${anime.score.toFixed(1)}/100**`,
      inline: true,
    });
  }

  if (anime.genres.length > 0) {
    fields.push({
      name: '🏷️ Gêneros',
      value: anime.genres.join(' • '),
      inline: false,
    });
  }

  if (anime.streams.length > 0) {
    const streams = anime.streams
      .slice(0, 5)
      .map((stream) => `[${stream.name}](${stream.url})`)
      .join(' • ');

    fields.push({
      name: '▶️ Onde assistir',
      value: streams,
      inline: false,
    });
  }

  const externalLinks: string[] = [];

  if (anime.malUrl) {
    externalLinks.push(`[MyAnimeList](${anime.malUrl})`);
  }

  if (anime.aniListUrl) {
    externalLinks.push(`[AniList](${anime.aniListUrl})`);
  }

  externalLinks.push(`[AnimeSchedule](${anime.animeScheduleUrl})`);

  fields.push({
    name: '🔗 Mais informações',
    value: externalLinks.join(' • '),
    inline: false,
  });

  return {
    author: {
      name: '🎌 NOVO EPISÓDIO LEGENDADO',
    },

    title: `${anime.title} — Episódio ${anime.episode}`,

    url: anime.animeScheduleUrl,

    description: truncate(anime.description, 1000),

    color: 0xff3344,

    fields,

    thumbnail: anime.posterUrl
      ? {
          url: anime.posterUrl,
        }
      : undefined,

    footer: {
      text: '🎌 Coreia do Leo • Dados: AnimeSchedule.net',
    },
  };
}
