export interface MangaNamedResource {
  // Recurso relacionado ao mangá, como autor, gênero ou revista.
  malId: number;
  name: string;
  url: string | null;
}

export interface MangaCandidate {
  // Resultado leve da descoberta; detalhes completos são buscados somente depois.
  malId: number;

  title: string;
  titleEnglish: string | null;
  titleJapanese: string | null;

  type: string | null;
  status: string | null;

  startDate: string;

  url: string;

  imageUrl: string | null;
}

export interface MangaDetails extends MangaCandidate {
  // Modelo completo usado para montar a notificação final.
  titleSynonyms: string[];

  chapters: number | null;
  volumes: number | null;

  score: number | null;
  scoredBy: number | null;

  synopsis: string | null;

  authors: MangaNamedResource[];
  serializations: MangaNamedResource[];

  genres: MangaNamedResource[];
  demographics: MangaNamedResource[];
}

export interface MangaSearchWindow {
  // Intervalo inclusivo usado para validar a data inicial das obras.
  startDate: string;
  endDate: string;
}

export interface MangaProvider {
  // Contrato comum que permite alternar entre APIs sem alterar o fluxo principal.
  readonly name: string;

  // Descobre obras novas dentro da janela informada.
  getRecentlyStartedManga(window: MangaSearchWindow): Promise<MangaCandidate[]>;

  // Busca os campos necessários para construir o embed de uma obra.
  getMangaDetails(malId: number): Promise<MangaDetails>;
}
