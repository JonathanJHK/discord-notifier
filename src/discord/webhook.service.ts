interface DiscordEmbedField {
  // Campo individual exibido dentro de um embed do Discord.
  name: string;
  value: string;
  inline?: boolean;
}

interface DiscordEmbed {
  author?: {
    name: string;
    icon_url?: string;
  };

  title?: string;
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
  // Payload mínimo aceito pelo endpoint de webhook utilizado pelo bot.
  username?: string;
  content?: string;
  embeds?: DiscordEmbed[];
}

interface DiscordRateLimitResponse {
  retry_after?: number;
  global?: boolean;
}

function sleep(ms: number): Promise<void> {
  // Mantém a espera do webhook local ao serviço e reutilizável entre retries.
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRetryAfterMs(response: Response, body: string): number {
  /*
   * Primeiro tenta o header oficial.
   */
  const retryAfterHeader = response.headers.get('retry-after');

  if (retryAfterHeader) {
    const seconds = Number(retryAfterHeader);

    if (Number.isFinite(seconds)) {
      return Math.ceil(seconds * 1000);
    }
  }

  /*
   * Caso o Discord envie retry_after
   * no JSON da resposta.
   */
  try {
    const data = JSON.parse(body) as DiscordRateLimitResponse;

    if (typeof data.retry_after === 'number') {
      return Math.ceil(data.retry_after * 1000);
    }
  } catch {
    // Corpo não era JSON.
  }

  /*
   * Fallback caso nenhuma informação
   * esteja disponível.
   */
  return 5000;
}

export async function sendDiscordWebhook(
  webhookUrl: string,
  payload: DiscordWebhookPayload,
  attempts = 5,
): Promise<void> {
  // Diferencia falhas temporárias, que podem ser repetidas, de erros permanentes do payload.
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
        },

        body: JSON.stringify(payload),

        signal: AbortSignal.timeout(15_000),
      });

      /*
       * Webhook enviado normalmente.
       *
       * O Discord frequentemente retorna
       * 204 No Content para webhooks.
       */
      if (response.ok) {
        return;
      }

      const body = await response.text();

      /*
       * RATE LIMIT
       *
       * Não usamos nosso próprio backoff:
       * esperamos exatamente o período
       * solicitado pelo Discord.
       */
      if (response.status === 429) {
        const retryAfter = getRetryAfterMs(response, body);

        console.warn(`⚠️ Discord aplicou rate limit.`);

        console.log(
          `⏳ Aguardando aproximadamente ` +
            `${Math.ceil(retryAfter / 1000)}s...`,
        );

        await sleep(retryAfter + 250);

        continue;
      }

      /*
       * Erros 5xx podem ser temporários.
       */
      if (response.status >= 500) {
        throw new Error(
          `Discord temporariamente indisponível: ` +
            `${response.status} ` +
            `${response.statusText}`,
        );
      }

      throw new Error(
        `Erro permanente ao enviar webhook: ` +
          `${response.status} ` +
          `${response.statusText}\n` +
          body,
      );
    } catch (error) {
      lastError = error;

      const message = error instanceof Error ? error.message : String(error);

      /*
       * Não repetir erros que sabemos
       * que são permanentes.
       */
      if (message.startsWith('Erro permanente')) {
        throw error;
      }

      if (attempt === attempts) {
        break;
      }

      /*
       * Exponential backoff:
       *
       * 2s
       * 4s
       * 8s
       * 16s
       *
       * + jitter aleatório.
       */
      const baseDelay = 2000 * 2 ** (attempt - 1);

      const jitter = Math.floor(Math.random() * 1000);

      const delay = baseDelay + jitter;

      console.warn(`⚠️ Falha ao enviar webhook ` + `(${attempt}/${attempts}).`);

      console.log(
        `🔄 Nova tentativa em aproximadamente ` +
          `${Math.round(delay / 1000)}s...`,
      );

      await sleep(delay);
    }
  }

  throw (
    lastError ?? new Error('Não foi possível enviar a mensagem ao Discord.')
  );
}
