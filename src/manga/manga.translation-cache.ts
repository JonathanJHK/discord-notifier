import { mkdir, readFile, writeFile } from 'node:fs/promises';

import { createHash } from 'node:crypto';

const DATA_DIR = 'data';

const FILE_PATH = `${DATA_DIR}/manga-translations.json`;

interface TranslationCacheItem {
  sourceHash: string;
  translated: string;
}

type TranslationCache = Record<string, TranslationCacheItem>;

/**
 * Cria um hash da sinopse original.
 *
 * Se a fonte atualizar a descrição futuramente,
 * o hash muda e a tradução antiga deixa de ser usada.
 */
function createTextHash(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

/**
 * Lê o cache persistido.
 *
 * Caso o arquivo ainda não exista ou esteja
 * indisponível, retorna um cache vazio.
 */
async function readCache(): Promise<TranslationCache> {
  await mkdir(DATA_DIR, {
    recursive: true,
  });

  try {
    const content = await readFile(FILE_PATH, 'utf-8');

    return JSON.parse(content) as TranslationCache;
  } catch {
    return {};
  }
}

/**
 * Persiste todo o cache no arquivo JSON.
 */
async function writeCache(cache: TranslationCache): Promise<void> {
  await writeFile(FILE_PATH, JSON.stringify(cache, null, 2) + '\n', 'utf-8');
}

/**
 * Procura uma tradução pelo MAL ID.
 *
 * A tradução só é considerada válida quando
 * o hash da sinopse atual corresponde ao hash
 * utilizado na tradução armazenada.
 */
export async function getCachedMangaTranslation(
  malId: number,
  original: string,
): Promise<string | null> {
  const cache = await readCache();

  const key = String(malId);

  const cached = cache[key];

  if (!cached) {
    return null;
  }

  const currentHash = createTextHash(original);

  if (cached.sourceHash !== currentHash) {
    return null;
  }

  return cached.translated;
}

/**
 * Salva uma nova tradução associada ao MAL ID.
 */
export async function saveMangaTranslation(
  malId: number,
  original: string,
  translated: string,
): Promise<void> {
  const cache = await readCache();

  const key = String(malId);

  cache[key] = {
    sourceHash: createTextHash(original),

    translated,
  };

  await writeCache(cache);
}
