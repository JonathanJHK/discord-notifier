import type { MangaDetails } from './providers/manga-provider.js';

export interface MangaNotification {
  // Representação própria do bot, desacoplada do formato de cada provider.
  id: string;
  malId: number;

  title: string;
  romajiTitle: string | null;
  japaneseTitle: string | null;

  synopsis: string;

  startDate: string;

  authors: string[];
  serializations: string[];

  genres: string[];
  demographics: string[];

  score: number | null;

  imageUrl: string | null;
  malUrl: string;
}

export function createMangaNotificationId(malId: number): string {
  // O MAL ID é estável entre providers e evita notificações duplicadas.
  return String(malId);
}

export function mapMangaDetails(details: MangaDetails): MangaNotification {
  // Prioriza o título principal e usa os títulos alternativos quando necessário.
  const title =
    details.title?.trim() ||
    details.titleEnglish?.trim() ||
    details.titleJapanese?.trim() ||
    'Título não informado';

  const romajiTitle = details.title?.trim() || null;

  const japaneseTitle = details.titleJapanese?.trim() || null;

  // Normaliza listas e valores ausentes antes de entregá-los ao renderer do embed.
  return {
    id: createMangaNotificationId(details.malId),

    malId: details.malId,

    title,

    romajiTitle,

    japaneseTitle,

    synopsis: details.synopsis?.trim() || 'Sinopse não disponível.',

    startDate: details.startDate,

    authors: details.authors
      .map((author) => author.name.trim())
      .filter(Boolean),

    serializations: details.serializations
      .map((serialization) => serialization.name.trim())
      .filter(Boolean),

    genres: details.genres.map((genre) => genre.name.trim()).filter(Boolean),

    demographics: details.demographics
      .map((demographic) => demographic.name.trim())
      .filter(Boolean),

    score: details.score,

    imageUrl: details.imageUrl,

    malUrl: details.url,
  };
}
