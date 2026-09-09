import { mkdir, readFile, writeFile } from 'node:fs/promises';

const DATA_DIR = 'data';

const FILE_PATH = `${DATA_DIR}/sent-manga.json`;

async function ensureStateFile(): Promise<void> {
  // Garante que o estado exista antes de qualquer leitura ou gravação.
  await mkdir(DATA_DIR, {
    recursive: true,
  });

  try {
    await readFile(FILE_PATH, 'utf-8');
  } catch {
    await writeFile(FILE_PATH, '[]\n', 'utf-8');
  }
}

export async function getSentMangaIds(): Promise<number[]> {
  // Dados inválidos são tratados como estado vazio para não interromper o notificador.
  await ensureStateFile();

  try {
    const content = await readFile(FILE_PATH, 'utf-8');

    const data = JSON.parse(content);

    if (!Array.isArray(data)) {
      return [];
    }

    return data.filter(
      (id): id is number => typeof id === 'number' && Number.isInteger(id),
    );
  } catch {
    return [];
  }
}

export async function addSentMangaId(malId: number): Promise<void> {
  // O ID só entra no estado depois que o webhook confirmou o envio.
  const currentIds = await getSentMangaIds();

  if (currentIds.includes(malId)) {
    return;
  }

  const updatedIds = [...currentIds, malId];

  await writeFile(
    FILE_PATH,
    JSON.stringify(updatedIds, null, 2) + '\n',
    'utf-8',
  );
}
