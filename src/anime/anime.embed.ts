import type { AnimeNotification } from './anime.mapper.js';

function formatDate(date: Date | null): string {
  if (!date) {
    return 'Não informado';
  }

  return date.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function createAnimeEmbed(anime: AnimeNotification) {
  const episode =
    anime.episode !== null ? `Episódio ${anime.episode}` : 'Novo episódio';

  return {
    author: {
      name: '🎌  N O V O   E P I S Ó D I O',
    },

    title: anime.title,

    url: anime.link ?? undefined,

    description:
      anime.description ?? 'Novo episódio disponibilizado com legendas.',

    // Roxo
    color: 0x9146ff,

    fields: [
      {
        name: '📺 Episódio',
        value: `**${episode}**`,
        inline: true,
      },

      {
        name: '🕒 Lançamento',
        value: `**${formatDate(anime.releasedAt)}**`,
        inline: true,
      },

      ...(anime.link
        ? [
            {
              name: '🔗 AnimeSchedule',
              value: `[Ver anime ↗](${anime.link})`,
              inline: false,
            },
          ]
        : []),
    ],

    footer: {
      text: '🎌 Coreia do Leo • Fonte: AnimeSchedule.net',
    },
  };
}
