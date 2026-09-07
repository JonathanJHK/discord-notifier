import dotenv from 'dotenv';

// Carrega as variáveis de ambiente do arquivo .env antes de usar qualquer configuração.
// O override: true garante que valores externos tenham prioridade sobre os padrões.
dotenv.config({
  override: true,
});

// Lê os tokens/URLs necessários para comunicação com TMDB e Discord.
const tmdbAccessToken = process.env.TMDB_ACCESS_TOKEN?.trim();
const discordMoviesWebhookUrl = process.env.DISCORD_MOVIES_WEBHOOK_URL?.trim();

// Garante que a chave do TMDB foi configurada antes de qualquer requisição.
if (!tmdbAccessToken) {
  throw new Error('TMDB_ACCESS_TOKEN não foi informado.');
}

// Garante que a URL do webhook do Discord foi configurada antes do envio.
if (!discordMoviesWebhookUrl) {
  throw new Error('DISCORD_MOVIES_WEBHOOK_URL não foi informado.');
}

// Exporta um objeto centralizado com as variáveis usadas pelo projeto.
export const env = {
  tmdbAccessToken,
  discordMoviesWebhookUrl,
};
