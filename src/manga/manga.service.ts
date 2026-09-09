import { JikanEdgeMangaProvider } from './providers/jikan-edge.provider.js';

import { TenraiMangaProvider } from './providers/tenrai.provider.js';

import type {
  MangaCandidate,
  MangaDetails,
  MangaProvider,
  MangaSearchWindow,
} from './providers/manga-provider.js';

const providers: MangaProvider[] = [
  // Tenrai é a fonte principal; jikan-edge funciona como fallback para descoberta e detalhes.
  new TenraiMangaProvider(),
  new JikanEdgeMangaProvider(),
];

export async function getRecentlyStartedManga(
  window: MangaSearchWindow,
): Promise<MangaCandidate[]> {
  // O primeiro provider que responder com sucesso define a lista desta execução.
  let lastError: unknown;

  for (const provider of providers) {
    try {
      console.log(`\n📚 Tentando provider: ${provider.name}`);

      const manga = await provider.getRecentlyStartedManga(window);

      console.log(
        `✅ ${provider.name} respondeu com ` +
          `${manga.length} obra(s) válida(s).`,
      );

      return manga;
    } catch (error) {
      lastError = error;

      console.error(`❌ Provider ${provider.name} falhou.`);

      console.error(error);

      console.log('🔄 Tentando próximo provider...');
    }
  }

  throw lastError ?? new Error('Nenhum provider de mangá disponível.');
}

export async function getMangaDetails(malId: number): Promise<MangaDetails> {
  // Os detalhes seguem a mesma ordem de fallback para tolerar indisponibilidade parcial.
  let lastError: unknown;

  for (const provider of providers) {
    try {
      return await provider.getMangaDetails(malId);
    } catch (error) {
      lastError = error;

      console.warn(
        `⚠️ ${provider.name} falhou ao buscar ` + `detalhes do mangá ${malId}.`,
      );

      console.log('🔄 Tentando próximo provider...');
    }
  }

  throw (
    lastError ?? new Error(`Não foi possível obter detalhes do mangá ${malId}.`)
  );
}
