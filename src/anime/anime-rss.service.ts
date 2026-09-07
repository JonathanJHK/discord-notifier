import Parser from 'rss-parser';

// RSS que informa os episódios legendados do Anime Schedule.
const ANIME_SCHEDULE_SUB_RSS = 'https://animeschedule.net/subrss.xml';

// Parser genérico para interpretar feeds RSS/XML.
const parser = new Parser();

// Estrutura mínima de um item do feed para uso no bot.
export interface AnimeRssItem {
  id: string;
  title: string;
  link: string | null;
  publishedAt: Date | null;
  description: string | null;
}

// Delay simples para aplicar retry com intervalo entre tentativas.
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Busca o XML do RSS com retries para casos de timeout, 429 ou falha temporária.
async function fetchRssWithRetry(attempts = 5): Promise<string> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(ANIME_SCHEDULE_SUB_RSS, {
        headers: {
          Accept: 'application/rss+xml, application/xml, text/xml',
          'User-Agent': 'Coreia-do-Leo-Anime-Notifier/1.0',
        },

        signal: AbortSignal.timeout(15_000),
      });

      if (response.status === 429 || response.status >= 500) {
        throw new Error(`AnimeSchedule respondeu ${response.status}`);
      }

      if (!response.ok) {
        throw new Error(
          `Erro AnimeSchedule: ` + `${response.status} ${response.statusText}`,
        );
      }

      return await response.text();
    } catch (error) {
      lastError = error;

      if (attempt === attempts) {
        break;
      }

      const delay =
        2000 * 2 ** (attempt - 1) + Math.floor(Math.random() * 1000);

      console.warn(`⚠️ Falha no AnimeSchedule (${attempt}/${attempts}).`);

      console.log(
        `🔄 Nova tentativa em aproximadamente ` +
          `${Math.round(delay / 1000)}s...`,
      );

      await sleep(delay);
    }
  }

  throw lastError ?? new Error('Não foi possível acessar o AnimeSchedule.');
}

export async function getAnimeScheduleFeed(): Promise<AnimeRssItem[]> {
  const xml = await fetchRssWithRetry();

  const feed = await parser.parseString(xml);

  return feed.items.map((item) => ({
    id:
      item.guid ??
      item.link ??
      `${item.title ?? 'unknown'}-${item.pubDate ?? ''}`,

    title: item.title ?? 'Título desconhecido',

    link: item.link ?? null,

    publishedAt: item.pubDate ? new Date(item.pubDate) : null,

    description: item.contentSnippet ?? item.content ?? null,
  }));
}
