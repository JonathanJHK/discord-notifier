import type { EmbedCoverMode } from '../discord/embed-media.js';
import { buildEmbedMedia } from '../discord/embed-media.js';
import type { MangaNotification } from './manga.mapper.js';

interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

interface DiscordEmbed {
  author?: {
    name: string;
  };

  title?: string;
  url?: string;

  description?: string;

  color?: number;

  fields?: DiscordEmbedField[];

  thumbnail?: {
    url: string;
  };

  image?: {
    url: string;
  };

  footer?: {
    text: string;
  };
}

function formatDate(date: string): string {
  // A API fornece a data em ISO; o embed usa a ordem habitual no Brasil.
  const [year, month, day] = date.split('-');

  if (!year || !month || !day) {
    return date;
  }

  return `${day}/${month}/${year}`;
}

function truncate(text: string, maxLength: number): string {
  // Mantém a sinopse dentro do limite visual definido para o embed.
  if (text.length <= maxLength) {
    return text;
  }

  return text.slice(0, maxLength - 3).trimEnd() + '...';
}

function formatList(values: string[], fallback: string): string {
  // Evita campos vazios e mantém um texto explícito quando a API não retorna itens.
  if (values.length === 0) {
    return fallback;
  }

  return values.join(', ');
}

export function createMangaEmbed(
  manga: MangaNotification,
  coverMode: EmbedCoverMode = 'image',
): DiscordEmbed {
  // A apresentação fica concentrada aqui para que o mapper permaneça livre de regras do Discord.
  const publication = formatList(
    manga.serializations,
    'Publicação não informada',
  );

  const fields: DiscordEmbedField[] = [
    {
      name: '📅 Início da publicação',
      value: formatDate(manga.startDate),
      inline: true,
    },

    {
      name: '⭐ Nota',
      value:
        manga.score !== null ? manga.score.toFixed(2) : 'Ainda sem avaliação',
      inline: true,
    },

    {
      name: '✍️ Autor(es)',
      value: formatList(manga.authors, 'Não informado'),
      inline: false,
    },
  ];

  if (manga.genres.length > 0) {
    fields.push({
      name: '🏷️ Gêneros',
      value: manga.genres.join(' • '),
      inline: true,
    });
  }

  if (manga.demographics.length > 0) {
    fields.push({
      name: '👥 Demografia',
      value: manga.demographics.join(' • '),
      inline: true,
    });
  }

  if (manga.japaneseTitle) {
    fields.push({
      name: '🇯🇵 Japonês',
      value: manga.japaneseTitle,
      inline: false,
    });
  }

  const media = buildEmbedMedia({
    imageUrl: manga.imageUrl,
    mode: coverMode,
  });

  return {
    author: {
      name: `📰 ${publication.toUpperCase()}`,
    },

    title: manga.title,

    url: manga.malUrl,

    description:
      `${truncate(manga.synopsis, 1800)}\n\n` +
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',

    color: 0xe056fd,

    fields,

    ...media,

    footer: {
      text: '📚 Coreia do Leo • Dados: MyAnimeList via Tenrai/jikan-edge',
    },
  };
}
