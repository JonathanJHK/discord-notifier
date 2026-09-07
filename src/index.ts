import {
  getBrazilTheatricalReleases,
  getMovieDetails,
} from './movies/tmdb.service.js';

import { createMovieEmbed } from './movies/movie.embed.js';
import { mapMovieDetails } from './movies/movie.mapper.js';
import { addSentMovieId, getSentMovieIds } from './movies/movie.state.js';

import { sendDiscordWebhook } from './discord/webhook.service.js';
import { getBrazilDate } from './utils/date.js';
import { sleep } from './utils/sleep.js';

async function main() {
  const today = getBrazilDate();

  console.log(`🇧🇷 Buscando estreias nos cinemas em ${today}...\n`);

  const releases = await getBrazilTheatricalReleases(today, today);

  if (releases.length === 0) {
    console.log('Nenhuma estreia encontrada para hoje.');
    return;
  }

  console.log(`🎬 Encontrados ${releases.length} lançamentos.`);

  const sentMovieIds = await getSentMovieIds();

  const newReleases = releases.filter(
    (release) => !sentMovieIds.includes(release.id),
  );

  if (newReleases.length === 0) {
    console.log('✅ Nenhum lançamento novo para enviar.');
    return;
  }

  console.log(`📨 ${newReleases.length} lançamento(s) novo(s) para enviar.\n`);

  for (const release of newReleases) {
    try {
      console.log(`Buscando detalhes de: ${release.title}`);

      const details = await getMovieDetails(release.id);

      const movie = mapMovieDetails(details, release.release_date);

      const embed = createMovieEmbed(movie);

      await sendDiscordWebhook({
        username: '🎬 Central da CineCoreia',
        content: '🍿 **NOVA ESTREIA NOS CINEMAS**',
        embeds: [embed],
      });

      await addSentMovieId(release.id);

      console.log(`✅ ${movie.title} enviado com sucesso!`);

      // pequena pausa entre mensagens
      await sleep(1500);
    } catch (error) {
      console.error(`❌ Erro ao processar ${release.title}:`, error);
    }
  }

  console.log('\n🏁 Processo finalizado.');
}

main().catch((error) => {
  console.error('❌ Erro geral:', error);
  process.exit(1);
});
