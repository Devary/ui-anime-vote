import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-crud-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="backdrop" (click)="onClose()"></div>
    <div class="panel" role="dialog" aria-modal="true">
      <div class="panel-header">
        <span class="panel-title">{{ title() }}</span>
        <button class="close-btn" type="button" (click)="onClose()" aria-label="Close">✕</button>
      </div>
      <div class="panel-body">
        <ng-content />
      </div>
    </div>
  `,
  styles: [`
    .backdrop {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.55);
      z-index: 199;
    }
    .panel {
      position: fixed;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      z-index: 200;
      background: var(--rz-surface, #fff);
      border: 1px solid var(--rz-border, #e2e8f0);
      border-radius: var(--rz-radius-md, 8px);
      max-width: 560px;
      width: calc(100vw - 2rem);
      max-height: 85vh;
      overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      display: flex;
      flex-direction: column;
    }
    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.25rem 0.75rem;
      border-bottom: 1px solid var(--rz-border, #e2e8f0);
      flex-shrink: 0;
    }
    .panel-title {
      font-size: 0.95rem;
      font-weight: 700;
      color: var(--rz-ink, #1a202c);
    }
    .close-btn {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 1rem;
      color: var(--rz-ink-muted, #718096);
      padding: 0.25rem 0.4rem;
      border-radius: var(--rz-radius-sm, 4px);
      line-height: 1;
    }
    .close-btn:hover {
      background: var(--rz-surface-hover, #f7fafc);
      color: var(--rz-ink, #1a202c);
    }
    .panel-body {
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
  `]
})
export class CrudModalComponent {
  readonly title = input.required<string>();
  readonly closeRequest = output<void>();

  onClose(): void { this.closeRequest.emit(); }
}
