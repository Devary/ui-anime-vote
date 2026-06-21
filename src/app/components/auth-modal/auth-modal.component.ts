import { Component, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

type Tab = 'login' | 'register';

@Component({
  selector: 'app-auth-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './auth-modal.component.html',
  styleUrl: './auth-modal.component.scss'
})
export class AuthModalComponent {
  readonly close = output<void>();

  private readonly auth = inject(AuthService);

  readonly activeTab = signal<Tab>('login');
  readonly loading   = signal(false);
  readonly error     = signal<string | null>(null);

  // Login form
  loginUsername = '';
  loginPassword = '';

  // Register form
  regUsername = '';
  regEmail    = '';
  regPassword = '';
  regConfirm  = '';

  switchTab(tab: Tab): void {
    this.activeTab.set(tab);
    this.error.set(null);
  }

  submitLogin(): void {
    if (!this.loginUsername || !this.loginPassword) {
      this.error.set('Please fill in all fields');
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.auth.login(this.loginUsername, this.loginPassword).subscribe({
      next: () => { this.loading.set(false); this.close.emit(); },
      error: (e) => {
        this.loading.set(false);
        this.error.set(e?.error?.message ?? e?.error ?? 'Invalid credentials');
      }
    });
  }

  submitRegister(): void {
    if (!this.regUsername || !this.regEmail || !this.regPassword) {
      this.error.set('Please fill in all fields');
      return;
    }
    if (this.regPassword !== this.regConfirm) {
      this.error.set('Passwords do not match');
      return;
    }
    if (this.regPassword.length < 4) {
      this.error.set('Password must be at least 4 characters');
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.auth.register(this.regUsername, this.regEmail, this.regPassword).subscribe({
      next: () => { this.loading.set(false); this.close.emit(); },
      error: (e) => {
        this.loading.set(false);
        this.error.set(e?.error?.message ?? e?.error ?? 'Registration failed');
      }
    });
  }
}
