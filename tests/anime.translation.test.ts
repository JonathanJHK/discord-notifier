import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * vi.hoisted permite que os mocks existam
 * antes dos módulos testados serem importados.
 */
const mocks = vi.hoisted(() => ({
  getCachedTranslation: vi.fn(),
  saveTranslation: vi.fn(),
  translateToPtBr: vi.fn(),
}));

vi.mock('../src/anime/anime.translation-cache.js', () => ({
  getCachedTranslation: mocks.getCachedTranslation,

  saveTranslation: mocks.saveTranslation,
}));

vi.mock('../src/translation/lara.service.js', () => ({
  translateToPtBr: mocks.translateToPtBr,
}));

import { getAnimeDescriptionPtBr } from '../src/anime/anime.translation.js';

describe('getAnimeDescriptionPtBr', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(console, 'log').mockImplementation(() => {});

    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('deve utilizar a tradução existente no cache', async () => {
    mocks.getCachedTranslation.mockResolvedValue('Descrição traduzida.');

    const result = await getAnimeDescriptionPtBr(
      'anime-teste',
      'Original description.',
    );

    expect(result).toBe('Descrição traduzida.');

    expect(mocks.translateToPtBr).not.toHaveBeenCalled();

    expect(mocks.saveTranslation).not.toHaveBeenCalled();
  });

  it('deve traduzir e salvar quando não existir cache', async () => {
    mocks.getCachedTranslation.mockResolvedValue(null);

    mocks.translateToPtBr.mockResolvedValue('Descrição traduzida.');

    const result = await getAnimeDescriptionPtBr(
      'anime-teste',
      'Original description.',
    );

    expect(mocks.translateToPtBr).toHaveBeenCalledWith('Original description.');

    expect(mocks.saveTranslation).toHaveBeenCalledWith(
      'anime-teste',
      'Original description.',
      'Descrição traduzida.',
    );

    expect(result).toBe('Descrição traduzida.');
  });

  it('deve manter a descrição original quando Lara não retornar tradução', async () => {
    mocks.getCachedTranslation.mockResolvedValue(null);

    mocks.translateToPtBr.mockResolvedValue(null);

    const original = 'Original description.';

    const result = await getAnimeDescriptionPtBr('anime-teste', original);

    expect(result).toBe(original);

    expect(mocks.saveTranslation).not.toHaveBeenCalled();
  });

  it('deve manter a descrição original quando Lara lançar erro', async () => {
    mocks.getCachedTranslation.mockResolvedValue(null);

    mocks.translateToPtBr.mockRejectedValue(new Error('Lara indisponível'));

    const original = 'Original description.';

    const result = await getAnimeDescriptionPtBr('anime-teste', original);

    expect(result).toBe(original);

    expect(mocks.saveTranslation).not.toHaveBeenCalled();
  });

  it('não deve tentar traduzir quando a descrição não estiver disponível', async () => {
    const description = 'Descrição não disponível.';

    const result = await getAnimeDescriptionPtBr('anime-teste', description);

    expect(result).toBe(description);

    expect(mocks.getCachedTranslation).not.toHaveBeenCalled();

    expect(mocks.translateToPtBr).not.toHaveBeenCalled();

    expect(mocks.saveTranslation).not.toHaveBeenCalled();
  });

  it('deve retornar a tradução mesmo se não conseguir salvar o cache', async () => {
    mocks.getCachedTranslation.mockResolvedValue(null);

    mocks.translateToPtBr.mockResolvedValue('Descrição traduzida.');

    mocks.saveTranslation.mockRejectedValue(new Error('Falha no arquivo'));

    const result = await getAnimeDescriptionPtBr(
      'anime-teste',
      'Original description.',
    );

    expect(result).toBe('Descrição traduzida.');
  });
});
