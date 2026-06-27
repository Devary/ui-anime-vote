import { Component, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnimeManagementComponent } from './anime-management/anime-management.component';
import { CharacterManagementComponent } from './character-management/character-management.component';
import { PollManagementComponent } from './poll-management/poll-management.component';
import { MultiPollManagementComponent } from './multi-poll-management/multi-poll-management.component';

type Section = 'anime' | 'characters' | 'polls' | 'multi-polls';

interface NavItem {
  id: Section;
  label: string;
  icon: string;
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
  ],
  templateUrl: './management.component.html',
  styleUrl: './management.component.scss',
})
export class ManagementComponent {
  readonly close = output<void>();

  readonly activeSection = signal<Section>('anime');

  readonly navItems: NavItem[] = [
    { id: 'anime',       label: 'Anime Management',      icon: '🎬' },
    { id: 'characters',  label: 'Character Management',   icon: '👤' },
    { id: 'polls',       label: 'Poll Management',        icon: '⚔' },
    { id: 'multi-polls', label: 'Multi-Poll Management',  icon: '🏆' },
  ];

  setSection(s: Section): void {
    this.activeSection.set(s);
  }

  activeLabel(): string {
    return this.navItems.find(n => n.id === this.activeSection())?.label ?? '';
  }
}
