import dns from 'node:dns';
import { getBrazilTheatricalReleases } from './movies/tmdb.service.js';
import { addDays, getBrazilDate } from './utils/date.js';

dns.setDefaultResultOrder('ipv4first');

async function main() {
  const today = getBrazilDate();
  const nextWeek = addDays(today, 7);

  console.log(`🇧🇷 Buscando estreias nos cinemas em ${today}...\n`);

  const movies = await getBrazilTheatricalReleases(today, nextWeek);

  if (movies.length === 0) {
    console.log('Nenhuma estreia encontrada para hoje.');
    return;
  }

  console.log(`🎬 Encontradas ${movies.length} estreias:\n`);

  for (const movie of movies) {
    console.log(`🎬 ${movie.title}`);

    if (movie.original_title !== movie.title) {
      console.log(`🌐 Título original: ${movie.original_title}`);
    }

    console.log(`📅 Estreia: ${movie.release_date}`);
    console.log(`⭐ TMDB: ${movie.vote_average.toFixed(1)}`);
    console.log(`🆔 ${movie.id}`);
    console.log('--------------------------------');
  }
}

main().catch((error) => {
  console.error('Erro:', error);
  process.exit(1);
});
