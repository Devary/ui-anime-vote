/** Mirrors the backend rules: text only, bounded, no URLs or hyperlinks. */
export const COMMENT_MAX_LENGTH = 500;

const LINK_PATTERN =
  /(https?:\/\/\S+|www\.\S+|\b[a-z0-9-]+\.(com|net|org|io|gg|me|tv|fr|tn|de|co|xyz|info|biz|ly|to|app|dev)(\/\S*)?\b)/i;

export function containsLink(text: string): boolean {
  return LINK_PATTERN.test(text);
}

/** Returns an i18n error key, or null when the comment is valid. */
export function validateComment(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return 'comments.errEmpty';
  if (trimmed.length > COMMENT_MAX_LENGTH) return 'comments.errTooLong';
  if (containsLink(trimmed)) return 'comments.errLink';
  return null;
}
