import dotenv from 'dotenv';

dotenv.config({
  override: true,
});

const tmdbAccessToken = process.env.TMDB_ACCESS_TOKEN?.trim();
const discordMoviesWebhookUrl = process.env.DISCORD_MOVIES_WEBHOOK_URL?.trim();

if (!tmdbAccessToken) {
  throw new Error('TMDB_ACCESS_TOKEN não foi informado.');
}

if (!discordMoviesWebhookUrl) {
  throw new Error('DISCORD_MOVIES_WEBHOOK_URL não foi informado.');
}

export const env = {
  tmdbAccessToken,
  discordMoviesWebhookUrl,
};

console.log(env.tmdbAccessToken, env.discordMoviesWebhookUrl);
