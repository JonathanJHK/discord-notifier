// Tipos usados para montar a estrutura de embed do Discord.
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

// Envia uma mensagem ou embed para o webhook configurado no Discord.
export async function sendDiscordWebhook(
  webhookUrl: string,
  payload: DiscordWebhookPayload,
): Promise<void> {
  const response = await fetch(webhookUrl, {
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
