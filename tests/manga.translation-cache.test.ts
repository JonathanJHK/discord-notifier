import { beforeEach, describe, expect, it, vi } from 'vitest';

const fakeFs = vi.hoisted(() => ({
  content: '{}',
}));

vi.mock('node:fs/promises', () => ({
  mkdir: vi.fn(async () => undefined),

  readFile: vi.fn(async () => fakeFs.content),

  writeFile: vi.fn(async (_path: string, content: string | Uint8Array) => {
    fakeFs.content = content.toString();
  }),
}));

import {
  getCachedMangaTranslation,
  saveMangaTranslation,
} from '../src/manga/manga.translation-cache.js';

describe('manga translation cache', () => {
  beforeEach(() => {
    fakeFs.content = '{}';
  });

  it('deve salvar e recuperar uma tradução', async () => {
    await saveMangaTranslation(
      123456,
      'Original synopsis.',
      'Sinopse traduzida.',
    );

    const result = await getCachedMangaTranslation(
      123456,
      'Original synopsis.',
    );

    expect(result).toBe('Sinopse traduzida.');
  });

  it('deve invalidar o cache quando a sinopse mudar', async () => {
    await saveMangaTranslation(123456, 'Original version 1.', 'Tradução.');

    const result = await getCachedMangaTranslation(
      123456,
      'Original version 2.',
    );

    expect(result).toBeNull();
  });

  it('não deve reutilizar tradução de outro MAL ID', async () => {
    await saveMangaTranslation(123456, 'Original synopsis.', 'Tradução.');

    const result = await getCachedMangaTranslation(
      999999,
      'Original synopsis.',
    );

    expect(result).toBeNull();
  });

  it('deve armazenar um SHA-256 válido', async () => {
    await saveMangaTranslation(
      123456,
      'Original synopsis.',
      'Sinopse traduzida.',
    );

    const cache = JSON.parse(fakeFs.content) as Record<
      string,
      {
        sourceHash: string;
        translated: string;
      }
    >;

    expect(cache['123456']?.sourceHash).toMatch(/^[a-f0-9]{64}$/);

    expect(cache['123456']?.translated).toBe('Sinopse traduzida.');
  });
});
