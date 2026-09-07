import { mkdir, readFile, writeFile } from 'node:fs/promises';

const DATA_DIR = 'data';

const SENT_ANIME_FILE = `${DATA_DIR}/sent-anime.json`;

async function ensureFileExists() {
  await mkdir(DATA_DIR, {
    recursive: true,
  });

  try {
    await readFile(SENT_ANIME_FILE, 'utf-8');
  } catch {
    await writeFile(SENT_ANIME_FILE, '[]', 'utf-8');
  }
}

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

export async function addSentAnimeId(id: string): Promise<void> {
  const ids = await getSentAnimeIds();

  if (ids.includes(id)) {
    return;
  }

  ids.push(id);

  await writeFile(SENT_ANIME_FILE, JSON.stringify(ids, null, 2), 'utf-8');
}
