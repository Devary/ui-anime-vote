import { validateComment, containsLink, sanitizeComment, COMMENT_MAX_LENGTH, COMMENT_MIN_LENGTH } from './comment-validation';

describe('comment validation (mirrors the backend rules)', () => {
  it('accepts plain text with punctuation', () => {
    expect(validateComment('Luffy vs. Zoro... e.g. round 2!? Great.')).toBeNull();
    expect(validateComment('عاش يا بطل! رائع جداً')).toBeNull();
  });

  it('rejects empty or whitespace-only comments', () => {
    expect(validateComment('')).toBe('comments.errEmpty');
    expect(validateComment('   ')).toBe('comments.errEmpty');
  });

  it('enforces the 6..349 character bounds', () => {
    expect(validateComment('hi')).toBe('comments.errTooShort');
    expect(validateComment('12345')).toBe('comments.errTooShort');
    expect(validateComment('123456')).toBeNull();
    expect(validateComment('x'.repeat(COMMENT_MAX_LENGTH))).toBeNull();
    expect(validateComment('x'.repeat(COMMENT_MAX_LENGTH + 1))).toBe('comments.errTooLong');
    expect(COMMENT_MIN_LENGTH).toBe(6);
    expect(COMMENT_MAX_LENGTH).toBe(349);
  });

  it('manages special characters: strips control chars, rejects markup', () => {
    expect(sanitizeComment('clean\u0007 text\u200B here')).toBe('clean text here');
    expect(validateComment('<b>hello world</b>')).toBe('comments.errMarkup');
    expect(validateComment('1 < 2 but 3 > 2 right?')).toBe('comments.errMarkup');
  });

  it('rejects links in every common form', () => {
    for (const bad of [
      'check https://spam.example.com now',
      'http://x.y/z is cool',
      'visit www.spam.com',
      'go to bit.ly/xyz',
      'animesite.com/page rocks',
      'my site is coolstuff.io',
    ]) {
      expect(validateComment(bad), bad).toBe('comments.errLink');
      expect(containsLink(bad), bad).toBe(true);
    }
  });

  it('does not flag ordinary abbreviations', () => {
    for (const ok of ['e.g. this one', 'Mr. Smith agrees', 'v2.0 is better', 'U.S. version']) {
      expect(containsLink(ok), ok).toBe(false);
    }
  });
});
