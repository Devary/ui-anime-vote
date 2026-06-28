import { Component, Input, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-countdown',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (display()) {
      <span class="countdown" [class.urgent]="isUrgent()" [class.ended]="isEnded()">
        <i class="pi pi-clock"></i> {{ display() }}
      </span>
    }
  `,
  styles: [`
    .countdown {
      display: inline-flex; align-items: center; gap: 0.3rem;
      font-size: 0.75rem; font-weight: 600; font-variant-numeric: tabular-nums;
      color: var(--rz-ink-muted);
      background: var(--rz-surface); border: 1px solid var(--rz-border-faint);
      padding: 0.2rem 0.5rem; border-radius: var(--rz-radius-sm);
      white-space: nowrap;
    }
    .countdown.urgent {
      color: var(--rz-danger);
      border-color: var(--rz-danger);
      background: var(--rz-danger-bg);
      animation: countdown-pulse 1s ease-in-out infinite;
    }
    .countdown.ended {
      color: var(--rz-ink-faint);
      border-color: transparent;
    }
    @keyframes countdown-pulse {
      0%, 100% { opacity: 1; }
      50%       { opacity: 0.6; }
    }
  `]
})
export class CountdownComponent implements OnInit, OnDestroy {
  @Input({ required: true }) endDate!: string;
  @Input() startDate?: string;

  readonly display  = signal('');
  readonly isUrgent = signal(false);
  readonly isEnded  = signal(false);

  private timer?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    this.tick();
    this.timer = setInterval(() => this.tick(), 1000);
  }

  ngOnDestroy(): void { clearInterval(this.timer); }

  private tick(): void {
    const now = Date.now();
    const end = new Date(this.endDate).getTime();
    const remaining = end - now;

    if (remaining <= 0) {
      this.display.set('Voting ended');
      this.isEnded.set(true);
      this.isUrgent.set(false);
      return;
    }

    const start = this.startDate ? new Date(this.startDate).getTime() : null;
    const total  = start !== null ? end - start : null;
    this.isUrgent.set(total !== null && remaining < total * 0.05);
    this.isEnded.set(false);
    this.display.set(this.format(remaining));
  }

  private format(ms: number): string {
    const s     = Math.floor(ms / 1000);
    const days  = Math.floor(s / 86400);
    const hours = Math.floor((s % 86400) / 3600);
    const mins  = Math.floor((s % 3600) / 60);
    const secs  = s % 60;
    const p     = (n: number) => n.toString().padStart(2, '0');
    return days > 0
      ? `${days}d ${p(hours)}:${p(mins)}:${p(secs)}`
      : `${p(hours)}:${p(mins)}:${p(secs)}`;
  }
}
