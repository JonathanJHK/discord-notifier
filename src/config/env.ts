import 'dotenv/config';

const tmdbAccessToken = process.env.TMDB_ACCESS_TOKEN?.trim();

if (!tmdbAccessToken) {
  throw new Error('TMDB_ACCESS_TOKEN não foi informado.');
}

export const env = {
  tmdbAccessToken,
};

console.log({
  tokenLoaded: Boolean(tmdbAccessToken),
  tokenLength: tmdbAccessToken?.length,
  tokenStart: tmdbAccessToken?.slice(0, 8),
});
