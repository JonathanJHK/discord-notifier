import type { AnimeRssItem } from './anime-rss.service.js';

export interface AnimeNotification {
  id: string;
  title: string;
  episode: number | null;
  releasedAt: Date | null;
  link: string | null;
  description: string | null;
}

function parseTitle(value: string): {
  animeTitle: string;
  episode: number | null;
} {
  const match = value.match(
    /^Episode\s+(\d+(?:\.\d+)?)\s+of\s+(.+?)\s+is out!$/i,
  );

  if (!match) {
    return {
      animeTitle: value,
      episode: null,
    };
  }

  return {
    episode: Number(match[1]),
    animeTitle: match[2].trim(),
  };
}

export function mapAnimeRssItem(item: AnimeRssItem): AnimeNotification {
  const parsed = parseTitle(item.title);

  /*
   * Vamos usar anime + episódio como chave.
   * Não usamos apenas o anime porque ele lança
   * um episódio novo toda semana.
   */
  const id =
    parsed.episode !== null
      ? `${parsed.animeTitle}-episode-${parsed.episode}`
          .toLowerCase()
          .replace(/\s+/g, '-')
      : item.id;

  return {
    id,
    title: parsed.animeTitle,
    episode: parsed.episode,
    releasedAt: item.publishedAt,
    link: item.link,
    description: item.description,
  };
}
