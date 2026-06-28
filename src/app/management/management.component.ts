import { Component, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service';
import { AnimeManagementComponent } from './anime-management/anime-management.component';
import { CharacterManagementComponent } from './character-management/character-management.component';
import { PollManagementComponent } from './poll-management/poll-management.component';
import { MultiPollManagementComponent } from './multi-poll-management/multi-poll-management.component';
import { UserManagementComponent } from './user-management/user-management.component';

type Section = 'anime' | 'characters' | 'polls' | 'multi-polls' | 'users';

interface NavItem {
  id: Section;
  label: string;
  icon: string;
  adminOnly: boolean;
}

@Component({
  selector: 'app-management',
  standalone: true,
  imports: [
    CommonModule,
    AnimeManagementComponent,
    CharacterManagementComponent,
    PollManagementComponent,
    MultiPollManagementComponent,
    UserManagementComponent,
  ],
  templateUrl: './management.component.html',
  styleUrl: './management.component.scss',
})
export class ManagementComponent {
  readonly close = output<void>();

  private readonly auth = inject(AuthService);
  readonly isAdmin = this.auth.isAdmin;

  readonly activeSection = signal<Section>('anime');

  readonly allNavItems: NavItem[] = [
    { id: 'anime',       label: 'Anime',       icon: '🎬', adminOnly: false },
    { id: 'characters',  label: 'Characters',  icon: '👤', adminOnly: false },
    { id: 'polls',       label: 'Polls',       icon: '⚔',  adminOnly: false },
    { id: 'multi-polls', label: 'Multi-Polls', icon: '🏆', adminOnly: false },
    { id: 'users',       label: 'Users',       icon: '👥', adminOnly: true  },
  ];

  get navItems(): NavItem[] {
    return this.allNavItems.filter(n => !n.adminOnly || this.isAdmin());
  }

  setSection(s: Section): void {
    this.activeSection.set(s);
  }

  activeLabel(): string {
    return this.allNavItems.find(n => n.id === this.activeSection())?.label ?? '';
  }
}
