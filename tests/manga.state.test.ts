import { beforeEach, describe, expect, it, vi } from 'vitest';

const fakeFs = vi.hoisted(() => ({
  content: '[]',
}));

vi.mock('node:fs/promises', () => ({
  mkdir: vi.fn(async () => undefined),

  readFile: vi.fn(async () => fakeFs.content),

  writeFile: vi.fn(async (_path: string, content: string | Uint8Array) => {
    fakeFs.content = content.toString();
  }),
}));

import { addSentMangaId, getSentMangaIds } from '../src/manga/manga.state.js';

describe('manga state', () => {
  beforeEach(() => {
    fakeFs.content = '[]';
  });

  it('deve iniciar sem IDs enviados', async () => {
    const result = await getSentMangaIds();

    expect(result).toEqual([]);
  });

  it('deve salvar um MAL ID', async () => {
    await addSentMangaId(123456);

    expect(await getSentMangaIds()).toEqual([123456]);
  });

  it('não deve salvar MAL ID duplicado', async () => {
    await addSentMangaId(123456);

    await addSentMangaId(123456);

    expect(await getSentMangaIds()).toEqual([123456]);
  });

  it('deve manter múltiplos IDs diferentes', async () => {
    await addSentMangaId(123456);

    await addSentMangaId(654321);

    expect(await getSentMangaIds()).toEqual([123456, 654321]);
  });
});
