import { addDays, getBrazilDate } from '../utils/date.js';

import { sleep } from '../utils/sleep.js';

import { getMangaDetails, getRecentlyStartedManga } from './manga.service.js';

import { mapMangaDetails } from './manga.mapper.js';

import { env } from '../config/env.js';

import { sendDiscordWebhook } from '../discord/webhook.service.js';

import { createMangaEmbed } from './manga.embed.js';

import { addSentMangaId, getSentMangaIds } from './manga.state.js';

async function main(): Promise<void> {
  // O fluxo descobre candidatos, remove duplicados persistidos e envia os detalhes formatados.
  const today = getBrazilDate();

  const startDate = addDays(today, -7);

  console.log('📚 Manga Release Notifier');

  console.log(`📅 Janela: ${startDate} → ${today}`);

  /*
   * Primeiro fazemos somente a descoberta.
   */
  const candidates = await getRecentlyStartedManga({
    startDate,
    endDate: today,
  });

  console.log(`\n🔎 ${candidates.length} candidato(s) encontrado(s).`);

  /*
   * Carregamos os MAL IDs já notificados.
   */
  const sentMangaIds = await getSentMangaIds();

  const newCandidates = candidates.filter(
    (candidate) => !sentMangaIds.includes(candidate.malId),
  );

  console.log(`🆕 ${newCandidates.length} obra(s) nova(s).`);

  if (newCandidates.length === 0) {
    console.log('\n✅ Nenhuma nova obra para processar.');

    return;
  }

  // Processa uma obra por execução para controlar o volume de chamadas e mensagens enviadas.
  const candidatesToSend = newCandidates.slice(0, 1);

  for (const candidate of candidatesToSend) {
    console.log('\n----------------------------------------');

    try {
      const details = await getMangaDetails(candidate.malId);

      const manga = mapMangaDetails(details);

      const embed = createMangaEmbed(manga);

      await sendDiscordWebhook(env.discordMangaWebhookUrl, {
        username: '📚 Central de Mangás',

        embeds: [embed],
      });

      await addSentMangaId(manga.malId);

      console.log(`✅ Mangá enviado: ${manga.title}`);
    } catch (error) {
      console.error(`❌ Falha ao processar ${candidate.title}.`, error);
    }

    await sleep(2500);
  }
}

main().catch((error) => {
  console.error('\n❌ Manga Notifier falhou:', error);

  process.exitCode = 1;
});
