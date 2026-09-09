import { describe, expect, it } from 'vitest';

import {
  createMangaNotificationId,
  mapMangaDetails,
} from '../src/manga/manga.mapper.js';

import type { MangaDetails } from '../src/manga/providers/manga-provider.js';

const details: MangaDetails = {
  malId: 123456,

  title: 'Manga Test',
  titleEnglish: 'Manga Test English',
  titleJapanese: '漫画テスト',

  titleSynonyms: [],

  type: 'Manga',
  status: 'Publishing',

  startDate: '2026-09-08',

  chapters: null,
  volumes: null,

  score: 8.4,
  scoredBy: 250,

  synopsis: 'Uma descrição de teste.',

  authors: [
    {
      malId: 10,
      name: 'Autor Teste',
      url: null,
    },
  ],

  serializations: [
    {
      malId: 20,
      name: 'Weekly Shounen Jump',
      url: null,
    },
  ],

  genres: [
    {
      malId: 30,
      name: 'Action',
      url: null,
    },

    {
      malId: 31,
      name: 'Comedy',
      url: null,
    },
  ],

  demographics: [
    {
      malId: 40,
      name: 'Shounen',
      url: null,
    },
  ],

  imageUrl: 'https://example.com/manga.jpg',

  url: 'https://myanimelist.net/manga/123456',
};

describe('createMangaNotificationId', () => {
  it('deve utilizar o MAL ID como identificador', () => {
    expect(createMangaNotificationId(123456)).toBe('123456');
  });
});

describe('mapMangaDetails', () => {
  it('deve mapear os dados corretamente', () => {
    const result = mapMangaDetails(details);

    expect(result.id).toBe('123456');

    expect(result.malId).toBe(123456);

    /*
     * Você decidiu priorizar o título
     * principal retornado pelo MAL.
     */
    expect(result.title).toBe('Manga Test');

    expect(result.japaneseTitle).toBe('漫画テスト');

    expect(result.authors).toEqual(['Autor Teste']);

    expect(result.serializations).toEqual(['Weekly Shounen Jump']);

    expect(result.genres).toEqual(['Action', 'Comedy']);

    expect(result.demographics).toEqual(['Shounen']);

    expect(result.score).toBe(8.4);

    expect(result.startDate).toBe('2026-09-08');
  });

  it('deve utilizar fallbacks quando dados opcionais estiverem ausentes', () => {
    const result = mapMangaDetails({
      ...details,

      synopsis: null,

      authors: [],
      serializations: [],
      genres: [],
      demographics: [],

      score: null,
      imageUrl: null,

      titleEnglish: null,
      titleJapanese: null,
    });

    expect(result.title).toBe('Manga Test');

    expect(result.synopsis).toBe('Sinopse não disponível.');

    expect(result.authors).toEqual([]);

    expect(result.serializations).toEqual([]);

    expect(result.genres).toEqual([]);

    expect(result.demographics).toEqual([]);

    expect(result.score).toBeNull();
    expect(result.imageUrl).toBeNull();
  });

  it('deve remover espaços extras dos dados textuais', () => {
    const result = mapMangaDetails({
      ...details,

      title: '  Manga Test  ',

      authors: [
        {
          malId: 10,
          name: '  Autor Teste  ',
          url: null,
        },
      ],
    });

    expect(result.title).toBe('Manga Test');

    expect(result.authors).toEqual(['Autor Teste']);
  });
});
