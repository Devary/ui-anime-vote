import { Component, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service';
import { AnimeManagementComponent } from './anime-management/anime-management.component';
import { CharacterManagementComponent } from './character-management/character-management.component';
import { PollManagementComponent } from './poll-management/poll-management.component';
import { MultiPollManagementComponent } from './multi-poll-management/multi-poll-management.component';
import { UserManagementComponent } from './user-management/user-management.component';
import { MyContentManagementComponent } from './my-content-management/my-content-management.component';
import { ApprovalManagementComponent } from './approval-management/approval-management.component';

type Section = 'anime' | 'characters' | 'polls' | 'multi-polls' | 'users' | 'my-content' | 'approvals';

interface NavItem {
  id: Section;
  label: string;
  icon: string;
  access: 'all' | 'moderator' | 'admin';
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
    MyContentManagementComponent,
    ApprovalManagementComponent,
  ],
  templateUrl: './management.component.html',
  styleUrl: './management.component.scss',
})
export class ManagementComponent {
  readonly close = output<void>();

  private readonly auth = inject(AuthService);
  readonly isAdmin     = this.auth.isAdmin;
  readonly canModerate = this.auth.canModerate;

  readonly activeSection = signal<Section>('my-content');

  readonly allNavItems: NavItem[] = [
    { id: 'my-content',  label: 'My Content', icon: '✦',  access: 'all'       },
    { id: 'anime',       label: 'Anime',       icon: '🎬', access: 'moderator' },
    { id: 'characters',  label: 'Characters',  icon: '👤', access: 'moderator' },
    { id: 'polls',       label: 'Polls',       icon: '⚔',  access: 'moderator' },
    { id: 'multi-polls', label: 'Multi-Polls', icon: '🏆', access: 'moderator' },
    { id: 'users',       label: 'Users',       icon: '👥', access: 'admin'     },
    { id: 'approvals',   label: 'Approvals',   icon: '✅', access: 'moderator' },
  ];

  get navItems(): NavItem[] {
    return this.allNavItems.filter(n =>
      n.access === 'all'
      || (n.access === 'moderator' && this.canModerate())
      || (n.access === 'admin' && this.isAdmin()));
  }

  setSection(s: Section): void {
    this.activeSection.set(s);
  }

  activeLabel(): string {
    return this.allNavItems.find(n => n.id === this.activeSection())?.label ?? '';
  }
}
