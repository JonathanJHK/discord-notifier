import { getAnimeScheduleFeed } from './anime-rss.service.js';

import { mapAnimeRssItem } from './anime.mapper.js';

import { createAnimeEmbed } from './anime.embed.js';

import { addSentAnimeId, getSentAnimeIds } from './anime.state.js';

import { sendDiscordWebhook } from '../discord/webhook.service.js';

import { env } from '../config/env.js';

async function main() {
  console.log('🎌 Buscando lançamentos legendados...\n');

  const items = await getAnimeScheduleFeed();

  const sentIds = await getSentAnimeIds();

  const now = new Date();

  const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const recentItems = items.filter((item) => {
    if (!item.publishedAt) {
      return false;
    }

    return item.publishedAt >= last24Hours && item.publishedAt <= now;
  });

  const mapped = recentItems.map(mapAnimeRssItem);

  const newEpisodes = mapped.filter((anime) => !sentIds.includes(anime.id));

  console.log(`📺 ${recentItems.length} episódio(s) recente(s).`);

  console.log(`🆕 ${newEpisodes.length} episódio(s) novo(s).\n`);

  if (newEpisodes.length === 0) {
    console.log('✅ Nenhum episódio novo para enviar.');

    return;
  }

  /*
   * POR ENQUANTO:
   * enviaremos somente um para
   * testar o visual.
   */
  const anime = newEpisodes[0];

  console.log(`🎌 Testando: ${anime.title} - ` + `Episódio ${anime.episode}`);

  const embed = createAnimeEmbed(anime);

  await sendDiscordWebhook(env.discordAnimeWebhookUrl, {
    username: '🎌 Central de Animes',

    embeds: [embed],
  });

  await addSentAnimeId(anime.id);

  console.log(`✅ ${anime.title} enviado para o Discord!`);
}

main().catch((error) => {
  console.error('❌ Erro:', error);

  process.exit(1);
});
