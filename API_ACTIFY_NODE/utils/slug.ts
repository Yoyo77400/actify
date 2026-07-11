const DIACRITICS_PATTERN = /[̀-ͯ]/g

export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(DIACRITICS_PATTERN, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}
