import { translateToPtBr } from '../translation/lara.service.js';

import {
  getCachedTranslation,
  saveTranslation,
} from './anime.translation-cache.js';

// Busca a descrição do anime em português, reutilizando cache sempre que possível.
export async function getAnimeDescriptionPtBr(
  route: string,
  original: string,
): Promise<string> {
  // Se não houver texto ou ele estiver indisponível, não tenta traduzir.
  if (!original.trim() || original === 'Descrição não disponível.') {
    return original;
  }

  /*
   * Primeiro tenta reaproveitar uma
   * tradução já existente para evitar
   * gastar chamada extra de API.
   */
  try {
    const cached = await getCachedTranslation(route, original);

    if (cached) {
      console.log(`🇧🇷 Tradução encontrada no cache: ${route}`);

      return cached;
    }
  } catch (error) {
    /*
     * Uma falha no cache não deve impedir
     * uma nova tentativa de tradução.
     */
    console.warn(
      `⚠️ Não foi possível ler o cache de tradução: ${route}`,
      error,
    );
  }

  let translated: string | null;

  try {
    // Consulta o serviço de tradução quando não existe valor em cache.
    translated = await translateToPtBr(original);
  } catch (error) {
    /*
     * Tradução é complementar.
     * O Anime Notifier deve continuar
     * funcionando mesmo se Lara falhar.
     */
    console.warn(`⚠️ Lara Translate indisponível para ${route}.`, error);

    return original;
  }

  if (!translated) {
    console.log(
      `ℹ️ Tradução indisponível para ${route}. ` + `Mantendo sinopse original.`,
    );

    return original;
  }

  /*
   * Falhar ao salvar o cache não deve
   * descartar uma tradução que já foi
   * obtida com sucesso.
   */
  try {
    await saveTranslation(route, original, translated);

    console.log(`💾 Tradução salva no cache: ${route}`);
  } catch (error) {
    console.warn(
      `⚠️ Não foi possível salvar a tradução no cache: ${route}`,
      error,
    );
  }

  return translated;
}
