/** Mirrors the backend rules: text only, 6..349 chars, no markup, no URLs. */
export const COMMENT_MIN_LENGTH = 6;   // "more than 5 characters"
export const COMMENT_MAX_LENGTH = 349; // "less than 350 characters"

const LINK_PATTERN =
  /(https?:\/\/\S+|www\.\S+|\b[a-z0-9-]+\.(com|net|org|io|gg|me|tv|fr|tn|de|co|xyz|info|biz|ly|to|app|dev)(\/\S*)?\b)/i;

const CONTROL_CHARS = /[\u0000-\u0009\u000B-\u001F\u007F\u200B-\u200F\u2028\u2029\uFEFF]/g;
const MARKUP_CHARS = /[<>]/;

export function containsLink(text: string): boolean {
  return LINK_PATTERN.test(text);
}

/** Special characters management: drop control/invisible characters like the backend does. */
export function sanitizeComment(text: string): string {
  return text.replace(CONTROL_CHARS, '').replace(/[ \t]{3,}/g, '  ').trim();
}

/** Returns an i18n error key, or null when the comment is valid. */
export function validateComment(text: string): string | null {
  const cleaned = sanitizeComment(text);
  if (!cleaned) return 'comments.errEmpty';
  if (cleaned.length < COMMENT_MIN_LENGTH) return 'comments.errTooShort';
  if (cleaned.length > COMMENT_MAX_LENGTH) return 'comments.errTooLong';
  if (MARKUP_CHARS.test(cleaned)) return 'comments.errMarkup';
  if (containsLink(cleaned)) return 'comments.errLink';
  return null;
}
