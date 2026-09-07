import {
  getBrazilTheatricalReleases,
  getMovieDetails,
  getMovieVideosWithFallback,
} from './movies/tmdb.service.js';

import { createMovieEmbed } from './movies/movie.embed.js';
import { mapMovieDetails } from './movies/movie.mapper.js';

import { addSentMovieId, getSentMovieIds } from './movies/movie.state.js';

import { sendDiscordWebhook } from './discord/webhook.service.js';

import { addDays, getBrazilDate } from './utils/date.js';

import { sleep } from './utils/sleep.js';

// Ponto principal de execução do bot.
// Ele consulta filmes que estreiam no Brasil, prepara o conteúdo e envia para o Discord.
async function main() {
  // Obtém a data atual no fuso de São Paulo para bater com a região do Brasil.
  const today = getBrazilDate();

  // Janela de segurança: busca a data atual e os 2 dias anteriores.
  // Isso evita perder filmes que estrearam em um período recente.
  const startDate = addDays(today, -2);

  console.log(
    `🇧🇷 Buscando estreias nos cinemas entre ${startDate} e ${today}...\n`,
  );

  // Consulta a API do TMDB para listar estreias na região Brasil.
  const releases = await getBrazilTheatricalReleases(startDate, today);

  // Se não houver estreia no período, encerra sem enviar nada.
  if (releases.length === 0) {
    console.log('Nenhuma estreia encontrada no período.');
    return;
  }

  console.log(`🎬 Encontrados ${releases.length} lançamentos no período.`);

  // Carrega os IDs dos filmes que já foram enviados para não duplicar mensagens.
  const sentMovieIds = await getSentMovieIds();

  // Filtra apenas os lançamentos ainda não enviados.
  const newReleases = releases.filter(
    (release) => !sentMovieIds.includes(release.id),
  );

  // Se tudo já foi enviado antes, encerra sem gastar requisições extras.
  if (newReleases.length === 0) {
    console.log('✅ Todos os lançamentos encontrados já foram enviados.');

    return;
  }

  console.log(`📨 ${newReleases.length} lançamento(s) novo(s) para enviar.\n`);

  let successCount = 0;
  let failureCount = 0;

  // Processa cada filme novo individualmente.
  for (const release of newReleases) {
    try {
      console.log(`🎬 Processando: ${release.title}`);

      // Busca os detalhes do filme, vídeos e formata a mensagem do embed.
      const details = await getMovieDetails(release.id);
      const videos = await getMovieVideosWithFallback(release.id);
      const movie = mapMovieDetails(details, release.release_date, videos);
      const embed = createMovieEmbed(movie);

      // Envia a mensagem para o webhook do Discord.
      await sendDiscordWebhook({
        username: '🎬 Central da CineCoreia',
        embeds: [embed],
      });

      // Registra o ID apenas depois que o envio no Discord foi confirmado.
      await addSentMovieId(release.id);

      successCount++;

      console.log(`✅ ${movie.title} enviado com sucesso!`);

      // Pausa para evitar disparar muitas requisições em sequência.
      await sleep(1500);
    } catch (error) {
      failureCount++;

      console.error(`❌ Erro ao processar ${release.title}:`, error);

      // Não registra o filme como enviado.
      // Na próxima execução, ele será tentado novamente.
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

// Executa a rotina principal e encerra com erro caso algo falhe de forma geral.
main().catch((error) => {
  console.error('❌ Erro geral durante a execução:', error);

  process.exit(1);
});
