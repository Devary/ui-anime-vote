import { validateComment, containsLink, COMMENT_MAX_LENGTH } from './comment-validation';

describe('comment validation (mirrors the backend rules)', () => {
  it('accepts plain text with punctuation', () => {
    expect(validateComment('Luffy vs. Zoro... e.g. round 2!? Great.')).toBeNull();
    expect(validateComment('عاش يا بطل! رائع جداً')).toBeNull();
  });

  it('rejects empty or whitespace-only comments', () => {
    expect(validateComment('')).toBe('comments.errEmpty');
    expect(validateComment('   ')).toBe('comments.errEmpty');
  });

  it('rejects comments over the limit', () => {
    expect(validateComment('x'.repeat(COMMENT_MAX_LENGTH + 1))).toBe('comments.errTooLong');
    expect(validateComment('x'.repeat(COMMENT_MAX_LENGTH))).toBeNull();
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
