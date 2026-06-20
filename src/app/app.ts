import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeStore } from './theme.store';
import { PollCardComponent } from './components/poll-card/poll-card.component';
import { POLLS, Poll } from './anime-data';

interface ShellThemeMessage {
  type: 'ui-anime-vote:theme';
  theme: 'light' | 'dark';
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, PollCardComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  private readonly themeStore = inject(ThemeStore);

  readonly isStandalone = window.self === window.top;
  readonly isDark       = this.themeStore.isDark;
  readonly toggleTheme  = () => this.themeStore.toggle();

  readonly polls: Poll[] = POLLS;
  readonly featuredPoll: Poll = POLLS[0];

  ngOnInit(): void {
    if (this.isStandalone) return;

    window.addEventListener('message', (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as Partial<ShellThemeMessage> | null;
      if (data?.type === 'ui-anime-vote:theme' && (data.theme === 'light' || data.theme === 'dark')) {
        this.themeStore.setTheme(data.theme);
      }
    });
    window.parent?.postMessage({ type: 'ui-anime-vote:request-theme' }, window.location.origin);
  }
}
