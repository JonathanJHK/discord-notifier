import { beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * Simulamos o conteúdo do arquivo JSON
 * em memória para que os testes não
 * escrevam diretamente no arquivo real
 * de cache do projeto.
 */
const fakeFs = vi.hoisted(() => ({
  content: '{}',
}));

// Mocka o módulo de arquivos para controlar leitura e escrita sem depender do sistema real.
vi.mock('node:fs/promises', () => ({
  mkdir: vi.fn(async () => undefined),

  readFile: vi.fn(async () => fakeFs.content),

  writeFile: vi.fn(async (_path: string, content: string | Uint8Array) => {
    fakeFs.content = content.toString();
  }),
}));

import {
  getCachedTranslation,
  saveTranslation,
} from '../src/anime/anime.translation-cache.js';

describe('anime translation cache', () => {
  beforeEach(() => {
    // Garante que cada teste comece com um cache limpo para evitar interferência entre cenários.
    fakeFs.content = '{}';
  });

  it('deve salvar e recuperar uma tradução', async () => {
    await saveTranslation(
      'anime-teste',
      'Original description.',
      'Descrição traduzida.',
    );

    const result = await getCachedTranslation(
      'anime-teste',
      'Original description.',
    );

    expect(result).toBe('Descrição traduzida.');
  });

  it('deve invalidar o cache quando a descrição original mudar', async () => {
    await saveTranslation(
      'anime-teste',
      'Descrição original versão 1.',
      'Descrição traduzida.',
    );

    const result = await getCachedTranslation(
      'anime-teste',
      'Descrição original versão 2.',
    );

    expect(result).toBeNull();
  });

  it('não deve reutilizar tradução de outro anime', async () => {
    await saveTranslation(
      'anime-a',
      'Original description.',
      'Descrição traduzida.',
    );

    const result = await getCachedTranslation(
      'anime-b',
      'Original description.',
    );

    expect(result).toBeNull();
  });

  it('deve armazenar a tradução sem armazenar novamente a descrição original', async () => {
    await saveTranslation(
      'anime-teste',
      'Uma descrição original.',
      'Uma descrição traduzida.',
    );

    // Verifica se o que foi salvo no cache contém apenas o hash e a tradução, sem duplicar o texto original.
    const cache = JSON.parse(fakeFs.content) as Record<
      string,
      {
        sourceHash: string;
        translated: string;
      }
    >;

    expect(cache['anime-teste']?.translated).toBe('Uma descrição traduzida.');

    expect(cache['anime-teste']?.sourceHash).toMatch(/^[a-f0-9]{64}$/);
  });
});
