import { TestBed } from '@angular/core/testing';
import { ShareService } from './share.service';

describe('ShareService', () => {
  let share: ShareService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    share = TestBed.inject(ShareService);
  });

  it('builds a per-poll deep link on the current origin', () => {
    const url = share.pollUrl('abc-123');
    expect(url).toBe(`${location.origin}${location.pathname}?p=abc-123`);
  });

  it('URL-encodes the poll id', () => {
    expect(share.pollUrl('a b/c')).toContain('?p=a%20b%2Fc');
  });

  it('reads the deep-linked poll id from ?p=', () => {
    history.replaceState(null, '', '?p=my-poll');
    try {
      expect(share.deepLinkedPollId()).toBe('my-poll');
    } finally {
      history.replaceState(null, '', location.pathname);
    }
  });

  it('returns null when no deep link is present', () => {
    expect(share.deepLinkedPollId()).toBeNull();
  });
});
