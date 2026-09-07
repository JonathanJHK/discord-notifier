import { env } from '../config/env.js';

interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

interface DiscordEmbed {
  author?: {
    name: string;
    icon_url?: string;
  };

  title: string;
  url?: string;
  description?: string;
  color?: number;
  fields?: DiscordEmbedField[];

  thumbnail?: {
    url: string;
  };

  image?: {
    url: string;
  };

  footer?: {
    text: string;
  };
}

interface DiscordWebhookPayload {
  username?: string;
  content?: string;
  embeds?: DiscordEmbed[];
}

export async function sendDiscordWebhook(
  payload: DiscordWebhookPayload,
): Promise<void> {
  const response = await fetch(env.discordMoviesWebhookUrl, {
    method: 'POST',

    headers: {
      'Content-Type': 'application/json',
    },

    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const responseBody = await response.text();

    throw new Error(
      `Erro ao enviar mensagem ao Discord: ` +
        `${response.status} ${response.statusText}\n` +
        responseBody,
    );
  }
}
