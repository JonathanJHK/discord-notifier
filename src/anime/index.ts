import { getAnimeDetails, getSubTimetable } from './anime-schedule.service.js';

import { createAnimeNotificationId, mapAnimeSchedule } from './anime.mapper.js';

import { createAnimeEmbed } from './anime.embed.js';

import { addSentAnimeId, getSentAnimeIds } from './anime.state.js';

import { sendDiscordWebhook } from '../discord/webhook.service.js';

import { env } from '../config/env.js';

import { sleep } from '../utils/sleep.js';

async function main() {
  console.log('🎌 Buscando episódios SUB...\n');

  const timetable = await getSubTimetable();

  const sentIds = await getSentAnimeIds();

  const now = new Date();

  /*
   * Janela de segurança.
   * Mesmo se uma execução falhar,
   * o episódio será recuperado depois.
   */
  const start = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const recent = timetable.filter((item) => {
    const episodeDate = new Date(item.episodeDate);

    return item.airType === 'sub' && episodeDate >= start && episodeDate <= now;
  });

  const newEpisodes = recent.filter(
    (item) => !sentIds.includes(createAnimeNotificationId(item)),
  );

  console.log(`📺 ${recent.length} episódio(s) recente(s).`);

  console.log(`🆕 ${newEpisodes.length} episódio(s) novo(s).\n`);

  if (newEpisodes.length === 0) {
    console.log('✅ Nenhum episódio novo.');

    return;
  }

  /*
   * Cache:
   * se houver dois episódios
   * do mesmo anime na mesma execução,
   * buscamos detalhes apenas uma vez.
   */
  const detailsCache = new Map();

  for (const timetableItem of newEpisodes) {
    try {
      console.log(
        `🎌 Processando: ` +
          `${timetableItem.title} ` +
          `- Episódio ` +
          `${timetableItem.episodeNumber}`,
      );

      let details = detailsCache.get(timetableItem.route);

      if (!details) {
        try {
          details = await getAnimeDetails(timetableItem.route);

          detailsCache.set(timetableItem.route, details);
        } catch (error) {
          /*
           * Importante:
           * se os detalhes falharem,
           * ainda conseguimos enviar
           * usando apenas o timetable.
           */
          console.warn(
            `⚠️ Não foi possível buscar ` +
              `detalhes de ${timetableItem.title}.`,
          );
        }
      }

      const anime = mapAnimeSchedule(timetableItem, details);

      const embed = createAnimeEmbed(anime);

      await sendDiscordWebhook(env.discordAnimeWebhookUrl, {
        username: '🎌 Central de CoreiaAnimes',

        embeds: [embed],
      });

      /*
       * Só marca como enviado
       * DEPOIS do Discord confirmar.
       */
      await addSentAnimeId(anime.id);

      console.log(
        `✅ ${anime.title} - ` + `Episódio ${anime.episode} enviado!`,
      );

      await sleep(1500);
    } catch (error) {
      console.error(`❌ Erro ao processar ` + `${timetableItem.title}:`, error);
    }
  }

  console.log('\n🏁 Anime Notifier finalizado.');
}

main().catch((error) => {
  console.error('❌ Erro geral:', error);

  process.exit(1);
});
