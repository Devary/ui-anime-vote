import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirm-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="backdrop" (click)="onCancel()"></div>
    <div class="dialog" role="dialog" aria-modal="true">
      <div class="icon">{{ danger() ? '⚠' : 'ℹ' }}</div>
      <div class="title">{{ title() }}</div>
      <div class="message">{{ message() }}</div>
      <div class="actions">
        <button class="btn-ghost" type="button" (click)="onCancel()">{{ cancelLabel() }}</button>
        <button [class]="danger() ? 'btn-danger' : 'btn-primary'" type="button" (click)="onConfirm()">
          {{ confirmLabel() }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .backdrop {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.4);
      z-index: 309;
    }
    .dialog {
      position: fixed;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      z-index: 310;
      background: var(--rz-surface, #fff);
      border: 1px solid var(--rz-border, #e2e8f0);
      border-radius: var(--rz-radius-md, 8px);
      padding: 1.5rem;
      max-width: 380px;
      width: calc(100vw - 2rem);
      box-shadow: 0 20px 60px rgba(0,0,0,0.25);
      display: flex; flex-direction: column; gap: 0.5rem;
    }
    .icon {
      font-size: 2rem;
      text-align: center;
      margin-bottom: 0.25rem;
    }
    .title {
      font-size: 1rem;
      font-weight: 700;
      text-align: center;
      color: var(--rz-ink, #1a202c);
    }
    .message {
      font-size: 0.85rem;
      color: var(--rz-ink-muted, #718096);
      text-align: center;
    }
    .actions {
      display: flex;
      flex-direction: row;
      gap: 0.75rem;
      justify-content: center;
      margin-top: 1rem;
    }
    .btn-ghost {
      padding: 0.4rem 1.1rem;
      border-radius: var(--rz-radius-sm, 4px);
      border: 1px solid var(--rz-border, #e2e8f0);
      background: transparent;
      color: var(--rz-ink, #1a202c);
      font-size: 0.82rem;
      cursor: pointer;
    }
    .btn-ghost:hover { background: var(--rz-surface-hover, #f7fafc); }
    .btn-primary {
      padding: 0.4rem 1.1rem;
      border-radius: var(--rz-radius-sm, 4px);
      border: none;
      background: var(--rz-primary, #1565c0);
      color: #fff;
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-primary:hover { opacity: 0.88; }
    .btn-danger {
      padding: 0.4rem 1.1rem;
      border-radius: var(--rz-radius-sm, 4px);
      border: 1px solid var(--rz-danger, #ef4444);
      background: var(--rz-danger, #ef4444);
      color: #fff;
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-danger:hover { opacity: 0.88; }
  `]
})
export class ConfirmModalComponent {
  readonly title         = input.required<string>();
  readonly message       = input.required<string>();
  readonly confirmLabel  = input<string>('Confirm');
  readonly cancelLabel   = input<string>('Cancel');
  readonly danger        = input<boolean>(true);

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  onConfirm(): void { this.confirmed.emit(); }
  onCancel(): void  { this.cancelled.emit(); }
}
