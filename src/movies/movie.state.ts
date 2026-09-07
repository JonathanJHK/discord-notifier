import { mkdir, readFile, writeFile } from 'node:fs/promises';

const DATA_DIR = 'data';
const SENT_MOVIES_FILE = `${DATA_DIR}/sent-movies.json`;

async function ensureFileExists() {
  await mkdir(DATA_DIR, { recursive: true });

  try {
    await readFile(SENT_MOVIES_FILE, 'utf-8');
  } catch {
    await writeFile(SENT_MOVIES_FILE, '[]', 'utf-8');
  }
}

export async function getSentMovieIds(): Promise<number[]> {
  await ensureFileExists();

  const content = await readFile(SENT_MOVIES_FILE, 'utf-8');

  try {
    const parsed = JSON.parse(content) as number[];

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((value) => typeof value === 'number');
  } catch {
    return [];
  }
}

export async function saveSentMovieIds(ids: number[]): Promise<void> {
  await ensureFileExists();

  const uniqueIds = [...new Set(ids)].sort((a, b) => a - b);

  await writeFile(
    SENT_MOVIES_FILE,
    JSON.stringify(uniqueIds, null, 2),
    'utf-8',
  );
}

export async function addSentMovieId(id: number): Promise<void> {
  const ids = await getSentMovieIds();

  if (ids.includes(id)) {
    return;
  }

  ids.push(id);

  await saveSentMovieIds(ids);
}
