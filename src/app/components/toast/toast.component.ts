import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.scss'
})
export class ToastComponent {
  readonly toastService = inject(ToastService);
  readonly toasts = this.toastService.toasts;

  icon(type: string): string {
    return { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' }[type] ?? 'ℹ';
  }
}
