/** Reader URL. Bundled `/papers/...` files go straight to static CDN (same-origin, fast). */
export function getPaperUrl(slug: string, id: string, paper?: { pdf?: string }) {
  if (paper?.pdf?.startsWith("/")) return paper.pdf;
  return `/api/paper/${encodeURIComponent(slug)}/${encodeURIComponent(id)}`;
}

/** Always the API so download disposition / cache headers stay correct. */
export function getPaperDownloadUrl(slug: string, id: string) {
  return `/api/paper/${encodeURIComponent(slug)}/${encodeURIComponent(id)}?download`;
}
