import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  MangaCandidate,
  MangaDetails,
  MangaSearchWindow,
} from '../src/manga/providers/manga-provider.js';

/**
 * Os mocks são criados antes dos módulos
 * serem carregados pelo Vitest.
 *
 * Assim conseguimos substituir completamente
 * os providers reais e nunca fazemos chamadas
 * HTTP durante os testes.
 */
const mocks = vi.hoisted(() => ({
  tenraiSearch: vi.fn(),

  tenraiDetails: vi.fn(),

  jikanSearch: vi.fn(),

  jikanDetails: vi.fn(),
}));

/**
 * Substitui o provider Tenrai real.
 *
 * O MangaService continuará acreditando que
 * está trabalhando com TenraiMangaProvider,
 * porém as respostas serão controladas
 * inteiramente pelos testes.
 */
vi.mock('../src/manga/providers/tenrai.provider.js', () => ({
  TenraiMangaProvider: class {
    readonly name = 'Tenrai';

    getRecentlyStartedManga(window: MangaSearchWindow) {
      return mocks.tenraiSearch(window);
    }

    getMangaDetails(malId: number) {
      return mocks.tenraiDetails(malId);
    }
  },
}));

/**
 * Faz o mesmo para o provider de fallback.
 */
vi.mock('../src/manga/providers/jikan-edge.provider.js', () => ({
  JikanEdgeMangaProvider: class {
    readonly name = 'jikan-edge';

    getRecentlyStartedManga(window: MangaSearchWindow) {
      return mocks.jikanSearch(window);
    }

    getMangaDetails(malId: number) {
      return mocks.jikanDetails(malId);
    }
  },
}));

import {
  getMangaDetails,
  getRecentlyStartedManga,
} from '../src/manga/manga.service.js';

const window: MangaSearchWindow = {
  startDate: '2026-09-01',

  endDate: '2026-09-09',
};

const candidate: MangaCandidate = {
  malId: 123456,

  title: 'Manga Test',

  titleEnglish: null,

  titleJapanese: null,

  type: 'Manga',

  status: 'Publishing',

  startDate: '2026-09-08',

  url: 'https://myanimelist.net/manga/123456',

  imageUrl: null,
};

const details: MangaDetails = {
  ...candidate,

  titleSynonyms: [],

  chapters: null,
  volumes: null,

  score: null,
  scoredBy: null,

  synopsis: 'Test synopsis.',

  authors: [],
  serializations: [],
  genres: [],
  demographics: [],
};

describe('MangaService provider fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    /**
     * Evita poluir a saída do Vitest
     * com os logs esperados de fallback.
     */
    vi.spyOn(console, 'log').mockImplementation(() => {});

    vi.spyOn(console, 'warn').mockImplementation(() => {});

    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('getRecentlyStartedManga', () => {
    it('deve utilizar Tenrai quando o provider principal funcionar', async () => {
      mocks.tenraiSearch.mockResolvedValue([candidate]);

      const result = await getRecentlyStartedManga(window);

      expect(result).toEqual([candidate]);

      expect(mocks.tenraiSearch).toHaveBeenCalledOnce();

      expect(mocks.tenraiSearch).toHaveBeenCalledWith(window);

      /**
       * O fallback não deve ser chamado
       * quando Tenrai funciona normalmente.
       */
      expect(mocks.jikanSearch).not.toHaveBeenCalled();
    });

    it('deve utilizar jikan-edge quando Tenrai falhar', async () => {
      mocks.tenraiSearch.mockRejectedValue(new Error('Tenrai 504'));

      mocks.jikanSearch.mockResolvedValue([candidate]);

      const result = await getRecentlyStartedManga(window);

      expect(result).toEqual([candidate]);

      expect(mocks.tenraiSearch).toHaveBeenCalledOnce();

      expect(mocks.jikanSearch).toHaveBeenCalledOnce();

      expect(mocks.jikanSearch).toHaveBeenCalledWith(window);
    });

    it('não deve usar fallback quando Tenrai retornar zero resultados', async () => {
      /**
       * [] é uma resposta válida.
       *
       * Nenhuma obra nova encontrada
       * não significa que a API falhou.
       */
      mocks.tenraiSearch.mockResolvedValue([]);

      const result = await getRecentlyStartedManga(window);

      expect(result).toEqual([]);

      expect(mocks.jikanSearch).not.toHaveBeenCalled();
    });

    it('deve lançar erro quando todos os providers falharem', async () => {
      mocks.tenraiSearch.mockRejectedValue(new Error('Tenrai indisponível'));

      mocks.jikanSearch.mockRejectedValue(new Error('jikan-edge indisponível'));

      await expect(getRecentlyStartedManga(window)).rejects.toThrow(
        'jikan-edge indisponível',
      );

      expect(mocks.tenraiSearch).toHaveBeenCalledOnce();

      expect(mocks.jikanSearch).toHaveBeenCalledOnce();
    });
  });

  describe('getMangaDetails', () => {
    it('deve utilizar Tenrai para buscar detalhes quando disponível', async () => {
      mocks.tenraiDetails.mockResolvedValue(details);

      const result = await getMangaDetails(123456);

      expect(result).toEqual(details);

      expect(mocks.tenraiDetails).toHaveBeenCalledWith(123456);

      expect(mocks.jikanDetails).not.toHaveBeenCalled();
    });

    it('deve buscar detalhes no jikan-edge quando Tenrai falhar', async () => {
      mocks.tenraiDetails.mockRejectedValue(new Error('Falha Tenrai'));

      mocks.jikanDetails.mockResolvedValue(details);

      const result = await getMangaDetails(123456);

      expect(result).toEqual(details);

      expect(mocks.tenraiDetails).toHaveBeenCalledWith(123456);

      expect(mocks.jikanDetails).toHaveBeenCalledWith(123456);
    });

    it('deve lançar erro quando nenhum provider conseguir buscar os detalhes', async () => {
      mocks.tenraiDetails.mockRejectedValue(new Error('Falha Tenrai'));

      mocks.jikanDetails.mockRejectedValue(new Error('Falha jikan-edge'));

      await expect(getMangaDetails(123456)).rejects.toThrow('Falha jikan-edge');
    });
  });
});
