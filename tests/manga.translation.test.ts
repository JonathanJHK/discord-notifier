import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getCachedMangaTranslation: vi.fn(),

  saveMangaTranslation: vi.fn(),

  translateToPtBr: vi.fn(),
}));

vi.mock('../src/manga/manga.translation-cache.js', () => ({
  getCachedMangaTranslation: mocks.getCachedMangaTranslation,

  saveMangaTranslation: mocks.saveMangaTranslation,
}));

vi.mock('../src/translation/lara.service.js', () => ({
  translateToPtBr: mocks.translateToPtBr,
}));

import { getMangaDescriptionPtBr } from '../src/manga/manga.translation.js';

describe('getMangaDescriptionPtBr', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(console, 'log').mockImplementation(() => {});

    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('deve usar tradução existente no cache', async () => {
    mocks.getCachedMangaTranslation.mockResolvedValue('Sinopse traduzida.');

    const result = await getMangaDescriptionPtBr(123456, 'Original synopsis.');

    expect(result).toBe('Sinopse traduzida.');

    expect(mocks.translateToPtBr).not.toHaveBeenCalled();
  });

  it('deve traduzir quando o cache não existir', async () => {
    mocks.getCachedMangaTranslation.mockResolvedValue(null);

    mocks.translateToPtBr.mockResolvedValue('Sinopse traduzida.');

    const result = await getMangaDescriptionPtBr(123456, 'Original synopsis.');

    expect(mocks.translateToPtBr).toHaveBeenCalledWith('Original synopsis.');

    expect(mocks.saveMangaTranslation).toHaveBeenCalledWith(
      123456,
      'Original synopsis.',
      'Sinopse traduzida.',
    );

    expect(result).toBe('Sinopse traduzida.');
  });

  it('deve manter a sinopse original quando Lara não retornar tradução', async () => {
    mocks.getCachedMangaTranslation.mockResolvedValue(null);

    mocks.translateToPtBr.mockResolvedValue(null);

    const original = 'Original synopsis.';

    const result = await getMangaDescriptionPtBr(123456, original);

    expect(result).toBe(original);

    expect(mocks.saveMangaTranslation).not.toHaveBeenCalled();
  });

  it('deve manter a sinopse original quando Lara falhar', async () => {
    mocks.getCachedMangaTranslation.mockResolvedValue(null);

    mocks.translateToPtBr.mockRejectedValue(new Error('Lara indisponível'));

    const original = 'Original synopsis.';

    const result = await getMangaDescriptionPtBr(123456, original);

    expect(result).toBe(original);
  });

  it('não deve chamar Lara quando a sinopse estiver indisponível', async () => {
    const synopsis = 'Sinopse não disponível.';

    const result = await getMangaDescriptionPtBr(123456, synopsis);

    expect(result).toBe(synopsis);

    expect(mocks.getCachedMangaTranslation).not.toHaveBeenCalled();

    expect(mocks.translateToPtBr).not.toHaveBeenCalled();
  });

  it('deve utilizar a tradução mesmo se o cache não puder ser salvo', async () => {
    mocks.getCachedMangaTranslation.mockResolvedValue(null);

    mocks.translateToPtBr.mockResolvedValue('Sinopse traduzida.');

    mocks.saveMangaTranslation.mockRejectedValue(new Error('Falha no cache'));

    const result = await getMangaDescriptionPtBr(123456, 'Original synopsis.');

    expect(result).toBe('Sinopse traduzida.');
  });
});
