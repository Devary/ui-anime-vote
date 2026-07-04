import { Component, computed, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrganizationChartModule } from 'primeng/organizationchart';
import { TreeNode } from 'primeng/api';
import { Character, Poll } from '../../anime-data';
import { VoteStore } from '../../vote.store';
import { ShareService } from '../../services/share.service';
import { I18nService } from '../../i18n/i18n.service';

@Component({
  selector: 'app-poll-card',
  standalone: true,
  imports: [CommonModule, OrganizationChartModule],
  templateUrl: './poll-card.component.html',
  styleUrl: './poll-card.component.scss'
})
export class PollCardComponent {
  readonly poll     = input.required<Poll>();
  readonly castVote = output<string>();

  readonly voteStore = inject(VoteStore);
  readonly i18n = inject(I18nService);
  private readonly shareService = inject(ShareService);

  readonly COLORS = ['#1565c0', '#c62828'];

  /** Only public polls get a shareable social-media link. */
  readonly isShareable = computed(() => (this.poll().visibility ?? 'PUBLIC') === 'PUBLIC');

  sharePoll(): void { this.shareService.share(this.poll().id, this.poll().question); }

  readonly myVoteId   = computed(() => this.voteStore.getMyVote(this.poll().id));
  readonly voted      = computed(() => this.myVoteId() !== null);
  readonly totalVotes = computed(() => {
    const p = this.poll();
    return this.voteStore.getPollTotal(p.fighter1.id, p.fighter2.id);
  });

  pct(fighter: Character): number {
    const total = this.totalVotes();
    return total > 0 ? (this.voteStore.getCount(fighter.id) / total) * 100 : 50;
  }

  /** Current leader once the user has voted; null before voting or on a tie. */
  readonly leader = computed<Character | null>(() => {
    if (!this.voted()) return null;
    const p  = this.poll();
    const c1 = this.voteStore.getCount(p.fighter1.id);
    const c2 = this.voteStore.getCount(p.fighter2.id);
    if (c1 === c2) return null;
    return c1 > c2 ? p.fighter1 : p.fighter2;
  });

  readonly orgNodes = computed<TreeNode[]>(() => {
    const p      = this.poll();
    const leader = this.leader();
    const voted  = this.voted();
    return [{
      expanded: true,
      type:     'winner',
      data:     leader ? { image: leader.image, name: leader.name } : null,
      children: [p.fighter1, p.fighter2].map((f, i) => ({
        type: 'fighter',
        data: {
          id:       f.id,
          image:    f.image,
          name:     f.name,
          title:    f.title,
          color:    this.COLORS[i],
          votes:    this.voteStore.getCount(f.id),
          pct:      this.pct(f),
          isMyVote: this.myVoteId() === f.id,
          isLeader: leader?.id === f.id,
          voted,
        },
      })),
    }];
  });

  onClickFighter(id: string): void {
    const current = this.myVoteId();
    if (!current) {
      this.castVote.emit(id);
    } else if (current !== id) {
      // one vote per poll, switchable at any time (polls have no end date)
      this.voteStore.changeVote(this.poll().id, current, id);
    }
  }
}
