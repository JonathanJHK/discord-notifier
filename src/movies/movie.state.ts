import { mkdir, readFile, writeFile } from 'node:fs/promises';

// Diretório e arquivo usados para registrar quais filmes já foram enviados.
const DATA_DIR = 'data';
const SENT_MOVIES_FILE = `${DATA_DIR}/sent-movies.json`;

// Cria a pasta e o arquivo de controle se eles ainda não existirem.
async function ensureFileExists() {
  // Permite iniciar o notificador mesmo quando o arquivo de estado ainda não existe.
  await mkdir(DATA_DIR, { recursive: true });

  try {
    await readFile(SENT_MOVIES_FILE, 'utf-8');
  } catch {
    await writeFile(SENT_MOVIES_FILE, '[]', 'utf-8');
  }
}

// Lê a lista de IDs já enviados e valida se o conteúdo é um array numérico.
export async function getSentMovieIds(): Promise<number[]> {
  // Ignora conteúdo inválido para que um arquivo de estado corrompido não pare o fluxo.
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

// Salva a lista final de IDs de filmes enviados, removendo duplicatas e ordenando.
export async function saveSentMovieIds(ids: number[]): Promise<void> {
  // Deduplica e ordena os IDs para manter o arquivo determinístico e legível.
  await ensureFileExists();

  const uniqueIds = [...new Set(ids)].sort((a, b) => a - b);

  await writeFile(
    SENT_MOVIES_FILE,
    JSON.stringify(uniqueIds, null, 2),
    'utf-8',
  );
}

// Adiciona um ID à lista apenas se ele ainda não estiver salvo.
export async function addSentMovieId(id: number): Promise<void> {
  // O filme só é persistido após o envio bem-sucedido ao Discord.
  const ids = await getSentMovieIds();

  if (ids.includes(id)) {
    return;
  }

  ids.push(id);

  await saveSentMovieIds(ids);
}
