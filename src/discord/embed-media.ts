/**
 * Define como a imagem principal será exibida no embed.
 *
 * image     → imagem grande na parte inferior
 * thumbnail → imagem pequena no canto superior direito
 * none      → não exibe imagem
 */
export type EmbedCoverMode = 'image' | 'thumbnail' | 'none';

interface EmbedMediaOptions {
  imageUrl: string | null;
  mode?: EmbedCoverMode;
}

/**
 * Monta os campos visuais de mídia do embed de forma reutilizável.
 *
 * O Discord permite duas formas principais de exibição:
 * - thumbnail: compacta
 * - image: grande, na parte inferior
 */
export function buildEmbedMedia({
  imageUrl,
  mode = 'image',
}: EmbedMediaOptions): {
  thumbnail?: { url: string };
  image?: { url: string };
} {
  if (!imageUrl || mode === 'none') {
    return {};
  }

  if (mode === 'thumbnail') {
    return {
      thumbnail: {
        url: imageUrl,
      },
    };
  }

  return {
    image: {
      url: imageUrl,
    },
  };
}
