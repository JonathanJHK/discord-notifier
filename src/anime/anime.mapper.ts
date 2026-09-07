import type {
  AnimeScheduleDetails,
  AnimeScheduleTimetable,
} from './anime-schedule.service.js';

import { getAnimeImageUrl } from './anime-schedule.service.js';

export interface AnimeStream {
  name: string;
  url: string;
}

export interface AnimeNotification {
  id: string;

  title: string;
  romaji: string | null;

  episode: string;

  releasedAt: string;

  duration: number | null;

  genres: string[];

  score: number | null;

  description: string;
  descriptionOriginal: string;

  posterUrl: string | null;

  animeScheduleUrl: string;

  malUrl: string | null;
  aniListUrl: string | null;

  streams: AnimeStream[];
}

function cleanHtml(html?: string): string {
  if (!html) {
    return 'Descrição não disponível.';
  }

  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

function normalizeUrl(value?: string): string | null {
  if (!value) {
    return null;
  }

  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value;
  }

  return `https://${value}`;
}

function getEpisodeLabel(timetable: AnimeScheduleTimetable): string {
  if (
    timetable.subtractedEpisodeNumber &&
    timetable.subtractedEpisodeNumber < timetable.episodeNumber
  ) {
    return (
      `${timetable.subtractedEpisodeNumber}` + `–${timetable.episodeNumber}`
    );
  }

  return String(timetable.episodeNumber);
}

export function createAnimeNotificationId(
  timetable: AnimeScheduleTimetable,
): string {
  return [timetable.route, timetable.airType, timetable.episodeNumber].join(
    ':',
  );
}

export function mapAnimeSchedule(
  timetable: AnimeScheduleTimetable,
  details?: AnimeScheduleDetails,
): AnimeNotification {
  const title =
    details?.title?.trim() ||
    details?.names?.english?.trim() ||
    timetable.title?.trim() ||
    timetable.english?.trim() ||
    timetable.romaji?.trim() ||
    'Título não informado';

  const romaji = details?.names?.romaji ?? timetable.romaji ?? null;

  const originalDescription = cleanHtml(details?.description);

  return {
    id: createAnimeNotificationId(timetable),

    title,

    romaji,

    episode: getEpisodeLabel(timetable),

    releasedAt: timetable.episodeDate,

    duration: timetable.lengthMin || null,

    genres: details?.genres?.map((genre) => genre.name) ?? [],

    score: details?.stats?.averageScore ?? null,

    description: originalDescription,
    descriptionOriginal: originalDescription,

    posterUrl: getAnimeImageUrl(
      details?.imageVersionRoute ?? timetable.imageVersionRoute,
    ),

    animeScheduleUrl: `https://animeschedule.net/anime/${timetable.route}`,

    malUrl: normalizeUrl(details?.websites?.mal),

    aniListUrl: normalizeUrl(details?.websites?.aniList),

    streams: (timetable.streams ?? [])
      .filter((stream) => Boolean(stream.url))
      .map((stream) => ({
        name: stream.name,
        url: normalizeUrl(stream.url) ?? stream.url,
      })),
  };
}
