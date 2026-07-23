import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnimeApiService } from '../../services/anime-api.service';
import { ToastService } from '../../services/toast.service';
import { DashboardDto, RankedItemDto } from '../../services/api.types';

/** Platform analytics: totals, breakdowns and top-5 rankings for content engagement. */
@Component({
  selector: 'app-dashboard-management',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard">
      <div class="section-header">
        <span class="section-title">Dashboard</span>
        <button class="btn-ghost-sm" (click)="load()" [disabled]="loading()">↻ Refresh</button>
      </div>

      @if (loading() && !data()) { <div class="loading">Loading…</div> }

      @if (data(); as d) {
        <div class="kpi-grid">
          <div class="kpi-card">
            <span class="kpi-icon">👥</span>
            <span class="kpi-value">{{ d.totalUsers | number }}</span>
            <span class="kpi-label">Users</span>
            <span class="kpi-sub">+{{ d.newUsersLast7Days }} last 7 days</span>
          </div>
          <div class="kpi-card">
            <span class="kpi-icon">🎬</span>
            <span class="kpi-value">{{ d.totalAnimes | number }}</span>
            <span class="kpi-label">Animes</span>
          </div>
          <div class="kpi-card">
            <span class="kpi-icon">👤</span>
            <span class="kpi-value">{{ d.totalCharacters | number }}</span>
            <span class="kpi-label">Characters</span>
          </div>
          <div class="kpi-card">
            <span class="kpi-icon">⚔</span>
            <span class="kpi-value">{{ d.totalPolls | number }}</span>
            <span class="kpi-label">Polls</span>
          </div>
          <div class="kpi-card">
            <span class="kpi-icon">🏆</span>
            <span class="kpi-value">{{ d.totalMultiPolls | number }}</span>
            <span class="kpi-label">Multi-Polls</span>
          </div>
          <div class="kpi-card highlight">
            <span class="kpi-icon">🗳</span>
            <span class="kpi-value">{{ d.totalVotes | number }}</span>
            <span class="kpi-label">Total Votes</span>
            <span class="kpi-sub">+{{ d.votesLast7Days }} last 7 days</span>
          </div>
          <div class="kpi-card">
            <span class="kpi-icon">💬</span>
            <span class="kpi-value">{{ d.totalComments | number }}</span>
            <span class="kpi-label">Comments</span>
          </div>
          <div class="kpi-card">
            <span class="kpi-icon">❤</span>
            <span class="kpi-value">{{ d.totalLikes | number }}</span>
            <span class="kpi-label">Likes</span>
          </div>
          <div class="kpi-card" [class.warn]="d.pendingApprovals > 0">
            <span class="kpi-icon">✅</span>
            <span class="kpi-value">{{ d.pendingApprovals | number }}</span>
            <span class="kpi-label">Pending Approvals</span>
          </div>
        </div>

        <div class="breakdown-row">
          <div class="breakdown-card">
            <span class="breakdown-title">Visibility</span>
            <div class="bar-row">
              <span class="bar-label">Public</span>
              <div class="bar-track"><div class="bar-fill public" [style.width.%]="pct(d.publicPolls, d.publicPolls + d.privatePolls)"></div></div>
              <span class="bar-value">{{ d.publicPolls }}</span>
            </div>
            <div class="bar-row">
              <span class="bar-label">Private</span>
              <div class="bar-track"><div class="bar-fill private" [style.width.%]="pct(d.privatePolls, d.publicPolls + d.privatePolls)"></div></div>
              <span class="bar-value">{{ d.privatePolls }}</span>
            </div>
          </div>
          <div class="breakdown-card">
            <span class="breakdown-title">Multi-Poll voting mode</span>
            <div class="bar-row">
              <span class="bar-label">By group</span>
              <div class="bar-track"><div class="bar-fill group" [style.width.%]="pct(d.votingByGroupPolls, d.votingByGroupPolls + d.votingByCharacterPolls)"></div></div>
              <span class="bar-value">{{ d.votingByGroupPolls }}</span>
            </div>
            <div class="bar-row">
              <span class="bar-label">By character</span>
              <div class="bar-track"><div class="bar-fill character" [style.width.%]="pct(d.votingByCharacterPolls, d.votingByGroupPolls + d.votingByCharacterPolls)"></div></div>
              <span class="bar-value">{{ d.votingByCharacterPolls }}</span>
            </div>
          </div>
        </div>

        <div class="rankings-grid">
          <div class="ranking-card">
            <span class="ranking-title">❤ Most Liked</span>
            @if (!d.mostLikedPolls.length) { <div class="empty">No likes yet.</div> }
            @for (item of d.mostLikedPolls; track item.id; let i = $index) {
              <div class="ranking-row">
                <span class="rank-num">{{ i + 1 }}</span>
                <span class="rank-question">{{ item.question }}</span>
                <span class="rank-type-badge" [class]="'type-' + item.type">{{ item.type === 'multi' ? 'Multi' : 'Poll' }}</span>
                <span class="rank-value">{{ item.value | number }}</span>
              </div>
            }
          </div>
          <div class="ranking-card">
            <span class="ranking-title">🗳 Most Voted</span>
            @if (!d.mostVotedPolls.length) { <div class="empty">No votes yet.</div> }
            @for (item of d.mostVotedPolls; track item.id; let i = $index) {
              <div class="ranking-row">
                <span class="rank-num">{{ i + 1 }}</span>
                <span class="rank-question">{{ item.question }}</span>
                <span class="rank-type-badge" [class]="'type-' + item.type">{{ item.type === 'multi' ? 'Multi' : 'Poll' }}</span>
                <span class="rank-value">{{ item.value | number }}</span>
              </div>
            }
          </div>
          <div class="ranking-card">
            <span class="ranking-title">💬 Most Commented</span>
            @if (!d.mostCommentedPolls.length) { <div class="empty">No comments yet.</div> }
            @for (item of d.mostCommentedPolls; track item.id; let i = $index) {
              <div class="ranking-row">
                <span class="rank-num">{{ i + 1 }}</span>
                <span class="rank-question">{{ item.question }}</span>
                <span class="rank-type-badge" [class]="'type-' + item.type">{{ item.type === 'multi' ? 'Multi' : 'Poll' }}</span>
                <span class="rank-value">{{ item.value | number }}</span>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .dashboard { display: flex; flex-direction: column; gap: 1.1rem; }
    .section-header { display: flex; justify-content: space-between; align-items: center; }
    .section-title { font-size: 1rem; font-weight: 800; color: var(--rz-ink); }
    .btn-ghost-sm { border: 1px solid var(--rz-border); background: transparent; color: var(--rz-ink-muted);
                    border-radius: var(--rz-radius-sm); padding: 0.25rem 0.6rem; cursor: pointer; }
    .btn-ghost-sm:hover:not(:disabled) { background: var(--rz-surface-hover); }
    .loading, .empty { color: var(--rz-ink-muted); font-size: 0.82rem; padding: 0.6rem 0; }

    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(9.5rem, 1fr)); gap: 0.75rem; }
    .kpi-card { display: flex; flex-direction: column; gap: 0.15rem; padding: 0.85rem 1rem;
                 border: 1px solid var(--rz-border-faint); border-radius: var(--rz-radius-md);
                 background: var(--rz-glass-bg); backdrop-filter: blur(var(--rz-glass-blur)); }
    .kpi-card.highlight { border-color: var(--rz-primary); background: color-mix(in srgb, var(--rz-primary) 8%, var(--rz-glass-bg)); }
    .kpi-card.warn { border-color: #f59e0b; }
    .kpi-icon { font-size: 1.3rem; }
    .kpi-value { font-size: 1.4rem; font-weight: 800; color: var(--rz-ink); font-variant-numeric: tabular-nums; }
    .kpi-label { font-size: 0.72rem; font-weight: 600; color: var(--rz-ink-muted); }
    .kpi-sub { font-size: 0.66rem; color: var(--rz-ink-faint); }

    .breakdown-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr)); gap: 0.75rem; }
    .breakdown-card { display: flex; flex-direction: column; gap: 0.5rem; padding: 0.85rem 1rem;
                        border: 1px solid var(--rz-border-faint); border-radius: var(--rz-radius-md); background: var(--rz-glass-bg); }
    .breakdown-title { font-size: 0.78rem; font-weight: 700; color: var(--rz-ink-muted); }
    .bar-row { display: flex; align-items: center; gap: 0.5rem; }
    .bar-label { width: 5.5rem; flex-shrink: 0; font-size: 0.75rem; color: var(--rz-ink-muted); }
    .bar-track { flex: 1; height: 0.5rem; border-radius: 99px; background: var(--rz-surface-hover); overflow: hidden; }
    .bar-fill { height: 100%; border-radius: 99px; transition: width 0.4s ease; }
    .bar-fill.public    { background: #16a34a; }
    .bar-fill.private   { background: #dc2626; }
    .bar-fill.group     { background: #7c3aed; }
    .bar-fill.character { background: #2563eb; }
    .bar-value { width: 2rem; text-align: right; font-size: 0.75rem; font-weight: 700; color: var(--rz-ink); }

    .rankings-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr)); gap: 0.75rem; }
    .ranking-card { display: flex; flex-direction: column; gap: 0.4rem; padding: 0.85rem 1rem;
                     border: 1px solid var(--rz-border-faint); border-radius: var(--rz-radius-md); background: var(--rz-glass-bg); }
    .ranking-title { font-size: 0.82rem; font-weight: 700; color: var(--rz-ink); margin-bottom: 0.2rem; }
    .ranking-row { display: flex; align-items: center; gap: 0.5rem; }
    .rank-num { width: 1.3rem; height: 1.3rem; border-radius: 50%; display: grid; place-items: center;
                 font-size: 0.68rem; font-weight: 700; background: var(--rz-surface-hover); color: var(--rz-ink-muted); flex-shrink: 0; }
    .rank-question { flex: 1; font-size: 0.78rem; color: var(--rz-ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .rank-type-badge { font-size: 0.6rem; font-weight: 700; padding: 0.1rem 0.4rem; border-radius: 99px; text-transform: uppercase; flex-shrink: 0; }
    .type-poll  { background: rgba(59,130,246,0.12); color: #2563eb; }
    .type-multi { background: rgba(124,58,237,0.12); color: #7c3aed; }
    .rank-value { font-size: 0.78rem; font-weight: 800; color: var(--rz-ink); font-variant-numeric: tabular-nums; flex-shrink: 0; }

    @media (max-width: 480px) { .kpi-grid { grid-template-columns: repeat(2, 1fr); } }
  `],
})
export class DashboardManagementComponent implements OnInit {
  private readonly api   = inject(AnimeApiService);
  private readonly toast = inject(ToastService);

  readonly data    = signal<DashboardDto | null>(null);
  readonly loading = signal(false);

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.api.getDashboard().subscribe({
      next: d => { this.data.set(d); this.loading.set(false); },
      error: e => { this.toast.error(e?.error?.message ?? 'Failed to load dashboard'); this.loading.set(false); },
    });
  }

  pct(value: number, total: number): number {
    return total > 0 ? (value / total) * 100 : 0;
  }
}
