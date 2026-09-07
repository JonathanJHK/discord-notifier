import { describe, expect, it } from 'vitest';

import {
  createAnimeNotificationId,
  mapAnimeSchedule,
} from '../src/anime/anime.mapper.js';

import type {
  AnimeScheduleDetails,
  AnimeScheduleTimetable,
} from '../src/anime/anime-schedule.service.js';

const timetable: AnimeScheduleTimetable = {
  title: 'Anime Teste',
  route: 'anime-teste',

  romaji: 'Anime Test',
  english: 'Anime Test',

  status: 'Airing',

  episodeDate: '2026-09-07T12:30:00-03:00',

  episodeNumber: 10,

  episodes: 12,
  lengthMin: 24,

  donghua: false,

  airType: 'sub',

  mediaTypes: [],

  imageVersionRoute: 'anime/teste.webp',

  streams: [
    {
      platform: 'Crunchyroll',
      name: 'Crunchyroll',
      url: 'crunchyroll.com/anime-teste',
    },
  ],

  airingStatus: 'aired',
};

const details: AnimeScheduleDetails = {
  id: '123',
  title: 'Anime Teste Completo',
  route: 'anime-teste',

  description:
    'Uma <strong>história</strong><br>' + 'sobre ação &amp; aventura.',

  names: {
    romaji: 'Anime Test Romaji',
    english: 'Anime Test English',
  },

  genres: [
    {
      name: 'Action',
      route: 'action',
    },
    {
      name: 'Adventure',
      route: 'adventure',
    },
  ],

  stats: {
    averageScore: 85,
    ratingCount: 500,
  },

  websites: {
    mal: 'myanimelist.net/anime/123',

    aniList: 'https://anilist.co/anime/123',
  },

  imageVersionRoute: 'anime/details.webp',
};

describe('createAnimeNotificationId', () => {
  it('deve gerar um identificador único para o episódio', () => {
    expect(createAnimeNotificationId(timetable)).toBe('anime-teste:sub:10');
  });
});

describe('mapAnimeSchedule', () => {
  it('deve mapear os dados do anime', () => {
    const result = mapAnimeSchedule(timetable, details);

    expect(result.title).toBe('Anime Teste Completo');

    expect(result.romaji).toBe('Anime Test Romaji');

    expect(result.episode).toBe('10');

    expect(result.duration).toBe(24);

    expect(result.genres).toEqual(['Action', 'Adventure']);

    expect(result.score).toBe(85);

    expect(result.id).toBe('anime-teste:sub:10');
  });

  it('deve remover HTML da descrição', () => {
    const result = mapAnimeSchedule(timetable, details);

    expect(result.description).toBe(
      'Uma história\n' + 'sobre ação & aventura.',
    );

    expect(result.descriptionOriginal).toBe(result.description);
  });

  it('deve normalizar links externos', () => {
    const result = mapAnimeSchedule(timetable, details);

    /*
     * MAL veio sem protocolo.
     */
    expect(result.malUrl).toBe('https://myanimelist.net/anime/123');

    /*
     * AniList já tinha HTTPS.
     */
    expect(result.aniListUrl).toBe('https://anilist.co/anime/123');

    expect(result.streams[0]?.url).toBe('https://crunchyroll.com/anime-teste');
  });

  it('deve representar intervalo de episódios', () => {
    const result = mapAnimeSchedule(
      {
        ...timetable,

        subtractedEpisodeNumber: 9,
        episodeNumber: 10,
      },

      details,
    );

    expect(result.episode).toBe('9–10');
  });

  it('deve funcionar mesmo sem detalhes do anime', () => {
    const result = mapAnimeSchedule(timetable);

    expect(result.title).toBe('Anime Teste');

    expect(result.genres).toEqual([]);
    expect(result.score).toBeNull();

    expect(result.description).toBe('Descrição não disponível.');

    expect(result.malUrl).toBeNull();
    expect(result.aniListUrl).toBeNull();
  });
});
