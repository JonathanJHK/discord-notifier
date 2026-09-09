import { Credentials, Translator } from '@translated/lara';

import { env } from '../config/env.js';

let translator: Translator | null = null;

function getTranslator(): Translator | null {
  // A instância é criada sob demanda para não exigir credenciais em fluxos que não traduzem texto.
  if (translator) {
    return translator;
  }

  const accessKeyId = env.laraAccessKeyId;

  const accessKeySecret = env.laraAccessKeySecret;

  if (!accessKeyId || !accessKeySecret) {
    return null;
  }

  const credentials = new Credentials(accessKeyId, accessKeySecret);

  translator = new Translator(credentials);

  return translator;
}

export async function translateToPtBr(text: string): Promise<string | null> {
  // Texto vazio não gera uma chamada inútil nem uma tradução vazia.
  if (!text.trim()) {
    return null;
  }

  const lara = getTranslator();

  if (!lara) {
    console.log(
      'ℹ️ Lara Translate não configurado. ' + 'Usando descrição original.',
    );

    return null;
  }

  try {
    console.log(
      `🌎 Traduzindo sinopse completa ` + `(${text.length} caracteres)...`,
    );

    const result = await lara.translate(
      text,

      'en-US',

      'pt-BR',

      {
        style: 'faithful',

        contentType: 'text/plain',

        timeoutInMillis: 15_000,
      },
    );

    if (typeof result.translation !== 'string') {
      throw new Error('Lara retornou uma tradução em formato inesperado.');
    }

    const translated = result.translation.trim();

    if (!translated) {
      return null;
    }

    return translated;
  } catch (error) {
    console.warn('⚠️ Não foi possível traduzir com Lara.', error);

    return null;
  }
}
