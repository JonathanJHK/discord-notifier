import dotenv from 'dotenv';

// Carrega as variáveis de ambiente do arquivo .env antes de usar qualquer configuração.
// O override: true garante que valores externos tenham prioridade sobre os padrões.
dotenv.config({
  override: true,
});

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} não foi informado.`);
  }

  return value;
}

export const env = {
  get tmdbAccessToken() {
    return requiredEnv('TMDB_ACCESS_TOKEN');
  },

  get animeScheduleToken() {
    return requiredEnv('ANIME_SCHEDULE_TOKEN');
  },

  get discordMoviesWebhookUrl() {
    return requiredEnv('DISCORD_MOVIES_WEBHOOK_URL');
  },

  get discordAnimeWebhookUrl() {
    return requiredEnv('DISCORD_ANIME_WEBHOOK_URL');
  },

  get laraAccessKeyId() {
    return process.env.LARA_ACCESS_KEY_ID?.trim() || null;
  },

  get laraAccessKeySecret() {
    return process.env.LARA_ACCESS_KEY_SECRET?.trim() || null;
  },
};
