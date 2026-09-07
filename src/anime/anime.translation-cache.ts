import { mkdir, readFile, writeFile } from 'node:fs/promises';

import { createHash } from 'node:crypto';

// Pasta onde fica armazenado o cache das traduções para não repetir chamadas desnecessárias.
const DATA_DIR = 'data';

// Arquivo JSON que guarda a tradução por rota do anime e o hash do texto original.
const FILE_PATH = `${DATA_DIR}/anime-translations.json`;

// Cada entrada salva no cache contém a assinatura do texto original e a tradução já obtida.
interface TranslationCacheItem {
  sourceHash: string;
  translated: string;
}

type TranslationCache = Record<string, TranslationCacheItem>;

// Gera um hash seguro do texto original para validar se a sinopse mudou desde a última tradução.
function createTextHash(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

// Lê o cache de traduções do disco e cria o arquivo caso ele ainda não exista.
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

// Salva o cache completo no arquivo JSON, mantendo o formato legível para depuração.
async function writeCache(cache: TranslationCache): Promise<void> {
  await writeFile(FILE_PATH, JSON.stringify(cache, null, 2), 'utf-8');
}

// Tenta recuperar uma tradução em cache para a mesma rota e mesma sinopse original.
export async function getCachedTranslation(
  route: string,
  original: string,
): Promise<string | null> {
  const cache = await readCache();

  const cached = cache[route];

  if (!cached) {
    return null;
  }

  const currentHash = createTextHash(original);

  // Se o texto original mudou, a tradução antiga não pode ser reutilizada.
  if (cached.sourceHash !== currentHash) {
    return null;
  }

  return cached.translated;
}

// Guarda a tradução de uma rota específica, vinculando ao hash do texto original.
export async function saveTranslation(
  route: string,
  original: string,
  translated: string,
): Promise<void> {
  const cache = await readCache();

  cache[route] = {
    sourceHash: createTextHash(original),

    translated,
  };

  await writeCache(cache);
}
