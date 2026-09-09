import { translateToPtBr } from '../translation/lara.service.js';

import {
  getCachedMangaTranslation,
  saveMangaTranslation,
} from './manga.translation-cache.js';

/**
 * Retorna a sinopse em PT-BR sempre que possível.
 *
 * A tradução não é uma dependência crítica:
 * qualquer falha mantém a descrição original
 * e o Manga Notifier continua normalmente.
 */
export async function getMangaDescriptionPtBr(
  malId: number,
  original: string,
): Promise<string> {
  if (!original.trim() || original === 'Sinopse não disponível.') {
    return original;
  }

  /**
   * Primeiro tentamos reaproveitar a tradução.
   *
   * Isso evita consumir novamente a API do Lara
   * para uma obra que já foi traduzida.
   */
  try {
    const cached = await getCachedMangaTranslation(malId, original);

    if (cached) {
      console.log(`🇧🇷 Tradução de mangá encontrada no cache: ${malId}`);

      return cached;
    }
  } catch (error) {
    /**
     * Uma falha de leitura do cache não deve
     * impedir uma tentativa de tradução.
     */
    console.warn(`⚠️ Falha ao ler cache de tradução do mangá ${malId}.`, error);
  }

  let translated: string | null = null;

  try {
    /**
     * A sinopse completa é enviada ao Lara.
     *
     * Não fazemos truncamento antes da tradução.
     */
    translated = await translateToPtBr(original);
  } catch (error) {
    console.warn(`⚠️ Lara indisponível para o mangá ${malId}.`, error);

    return original;
  }

  /**
   * Caso Lara esteja sem cota, sem credenciais
   * ou não consiga traduzir, usamos inglês.
   */
  if (!translated) {
    console.log(
      `ℹ️ Tradução indisponível para o mangá ${malId}. ` +
        `Mantendo sinopse original.`,
    );

    return original;
  }

  /**
   * Uma tradução obtida com sucesso continua
   * válida mesmo se houver falha ao persistir
   * o cache.
   */
  try {
    await saveMangaTranslation(malId, original, translated);

    console.log(`💾 Tradução de mangá salva no cache: ${malId}`);
  } catch (error) {
    console.warn(
      `⚠️ Não foi possível salvar o cache de tradução do mangá ${malId}.`,
      error,
    );
  }

  return translated;
}
