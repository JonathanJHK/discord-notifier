import {
  getBrazilTheatricalReleases,
  getMovieDetails,
} from './movies/tmdb.service.js';

import { createMovieEmbed } from './movies/movie.embed.js';
import { mapMovieDetails } from './movies/movie.mapper.js';

import { addSentMovieId, getSentMovieIds } from './movies/movie.state.js';

import { sendDiscordWebhook } from './discord/webhook.service.js';

import { addDays, getBrazilDate } from './utils/date.js';

import { sleep } from './utils/sleep.js';

async function main() {
  const today = getBrazilDate();

  // Janela de segurança:
  // procura hoje + os 2 dias anteriores.
  const startDate = addDays(today, -2);

  console.log(
    `🇧🇷 Buscando estreias nos cinemas entre ${startDate} e ${today}...\n`,
  );

  const releases = await getBrazilTheatricalReleases(startDate, today);

  if (releases.length === 0) {
    console.log('Nenhuma estreia encontrada no período.');
    return;
  }

  console.log(`🎬 Encontrados ${releases.length} lançamentos no período.`);

  const sentMovieIds = await getSentMovieIds();

  const newReleases = releases.filter(
    (release) => !sentMovieIds.includes(release.id),
  );

  if (newReleases.length === 0) {
    console.log('✅ Todos os lançamentos encontrados já foram enviados.');

    return;
  }

  console.log(`📨 ${newReleases.length} lançamento(s) novo(s) para enviar.\n`);

  let successCount = 0;
  let failureCount = 0;

  for (const release of newReleases) {
    try {
      console.log(`🎬 Processando: ${release.title}`);

      const details = await getMovieDetails(release.id);

      const movie = mapMovieDetails(details, release.release_date);

      const embed = createMovieEmbed(movie);

      await sendDiscordWebhook({
        username: '🎬 Central da CineCoreia',

        content: '🍿 **NOVA ESTREIA NOS CINEMAS**',

        embeds: [embed],
      });

      // IMPORTANTE:
      // só registra depois que o Discord confirmou o envio.
      await addSentMovieId(release.id);

      successCount++;

      console.log(`✅ ${movie.title} enviado com sucesso!`);

      // Evita disparar várias requisições seguidas.
      await sleep(1500);
    } catch (error) {
      failureCount++;

      console.error(`❌ Erro ao processar ${release.title}:`, error);

      // Não salvamos o ID.
      // Na próxima execução ele será tentado novamente.
    }
  }

  console.log('\n🏁 Processo finalizado.');

  console.log(`✅ Enviados: ${successCount}`);

  console.log(`❌ Falharam: ${failureCount}`);

  if (failureCount > 0) {
    console.log(
      '🔄 Os filmes que falharam serão tentados novamente na próxima execução.',
    );
  }
}

main().catch((error) => {
  console.error('❌ Erro geral durante a execução:', error);

  process.exit(1);
});
