export function getPaperUrl(slug: string, id: string) {
  return `/api/paper/${encodeURIComponent(slug)}/${encodeURIComponent(id)}`;
}
