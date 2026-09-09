import { sleep } from '../../utils/sleep.js';

function getRetryAfterMs(response: Response): number {
  // Respeita o intervalo indicado pelo provider e usa cinco segundos como fallback.
  const header = response.headers.get('retry-after');

  if (!header) {
    return 5000;
  }

  const seconds = Number(header);

  if (!Number.isFinite(seconds)) {
    return 5000;
  }

  return Math.ceil(seconds * 1000);
}

export async function fetchJsonWithRetry<T>(
  url: URL,
  providerName: string,
  attempts = 5,
): Promise<T> {
  // O helper uniformiza timeout, rate limit, retry e classificação de erros entre providers.
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
        },

        signal: AbortSignal.timeout(15_000),
      });

      if (response.ok) {
        return (await response.json()) as T;
      }

      /*
       * Rate limit.
       */
      if (response.status === 429) {
        const retryAfter = getRetryAfterMs(response);

        if (attempt === attempts) {
          throw new Error(`${providerName}: limite de requisições atingido.`);
        }

        console.warn(`⚠️ ${providerName} aplicou rate limit.`);

        console.log(
          `⏳ Nova tentativa em aproximadamente ` +
            `${Math.ceil(retryAfter / 1000)}s...`,
        );

        await sleep(retryAfter + 250);

        continue;
      }

      /*
       * Erros temporários do servidor.
       */
      if (response.status >= 500) {
        throw new Error(
          `${providerName} temporariamente indisponível: ` +
            `${response.status} ` +
            `${response.statusText}`,
        );
      }

      /*
       * Outros 4xx normalmente são
       * problemas permanentes da requisição.
       */
      const body = await response.text();

      throw new Error(
        `Erro permanente em ${providerName}: ` +
          `${response.status} ` +
          `${response.statusText}\n` +
          body,
      );
    } catch (error) {
      lastError = error;

      const message = error instanceof Error ? error.message : String(error);

      if (message.startsWith(`Erro permanente em ${providerName}`)) {
        throw error;
      }

      if (attempt === attempts) {
        break;
      }

      const baseDelay = 2000 * 2 ** (attempt - 1);

      const jitter = Math.floor(Math.random() * 1000);

      const delay = baseDelay + jitter;

      console.warn(
        `⚠️ Falha ao consultar ${providerName} ` + `(${attempt}/${attempts}).`,
      );

      console.log(
        `🔄 Nova tentativa em aproximadamente ` +
          `${Math.round(delay / 1000)}s...`,
      );

      await sleep(delay);
    }
  }

  throw lastError ?? new Error(`${providerName}: requisição não concluída.`);
}
