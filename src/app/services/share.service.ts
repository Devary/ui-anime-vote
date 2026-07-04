import { Injectable, inject } from '@angular/core';
import { ToastService } from './toast.service';
import { I18nService } from '../i18n/i18n.service';

/** Builds and shares per-poll deep links (?p=<pollId>) for social media. */
@Injectable({ providedIn: 'root' })
export class ShareService {
  private readonly toast = inject(ToastService);
  private readonly i18n  = inject(I18nService);

  pollUrl(pollId: string): string {
    return `${location.origin}${location.pathname}?p=${encodeURIComponent(pollId)}`;
  }

  /** Reads the poll id from the current URL, if any. */
  deepLinkedPollId(): string | null {
    return new URLSearchParams(location.search).get('p');
  }

  async share(pollId: string, question: string): Promise<void> {
    const url = this.pollUrl(pollId);
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Anime Vote', text: question, url });
        return;
      } catch { /* user cancelled or unsupported — fall back to clipboard */ }
    }
    try {
      await navigator.clipboard.writeText(url);
      this.toast.success(this.i18n.t('toast.linkCopied'));
    } catch {
      this.toast.info(url);
    }
  }
}
