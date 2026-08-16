// Codifica caminhos relativos (public/produtos/...) segmento a segmento para lidar com espacos, "+" e acentos.
// URLs absolutas (ex.: Supabase Storage) sao mantidas como estao, pois ja chegam corretamente codificadas.
export function encodeProductImageUrl(url: string): string {
  if (!url) {
    return url;
  }

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  return url
    .split("/")
    .map((segment) => {
      if (!segment) {
        return segment;
      }

      try {
        return encodeURIComponent(decodeURIComponent(segment));
      } catch {
        return encodeURIComponent(segment);
      }
    })
    .join("/");
}
