import { mkdir, readFile, writeFile } from 'node:fs/promises';

// Pasta e arquivo usados para guardar os IDs dos episódios já enviados ao Discord.
const DATA_DIR = 'data';
const SENT_ANIME_FILE = `${DATA_DIR}/sent-anime.json`;

// Cria a pasta e o arquivo de controle caso ainda não existam no projeto.
async function ensureFileExists() {
  // A inicialização idempotente permite executar o bot em um clone recém-criado.
  await mkdir(DATA_DIR, {
    recursive: true,
  });

  try {
    await readFile(SENT_ANIME_FILE, 'utf-8');
  } catch {
    await writeFile(SENT_ANIME_FILE, '[]', 'utf-8');
  }
}

// Lê a lista de episódios já enviados e valida se o conteúdo é um array de strings.
export async function getSentAnimeIds(): Promise<string[]> {
  await ensureFileExists();

  const content = await readFile(SENT_ANIME_FILE, 'utf-8');

  try {
    const parsed = JSON.parse(content);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((value): value is string => typeof value === 'string');
  } catch {
    return [];
  }
}

// Adiciona um novo ID de episódio apenas quando ele ainda não foi enviado antes.
export async function addSentAnimeId(id: string): Promise<void> {
  // O estado só é alterado após o envio confirmado pelo webhook.
  const ids = await getSentAnimeIds();

  if (ids.includes(id)) {
    return;
  }

  ids.push(id);

  await writeFile(SENT_ANIME_FILE, JSON.stringify(ids, null, 2), 'utf-8');
}
