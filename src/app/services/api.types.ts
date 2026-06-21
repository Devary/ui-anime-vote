export interface CharacterDto {
  id: string;
  name: string;
  title: string;
  anime: string;
  imageUrl: string;
}

export interface MultiPollGroupDto {
  id: string;
  label: string;
  groupOrder: number;
  candidates: CharacterDto[];
}

export interface PollResultDto {
  poll: {
    id: string;
    anime: string;
    question: string;
    fighter1: CharacterDto;
    fighter2: CharacterDto;
  };
  votes1: number;
  votes2: number;
  pct1: number;
  pct2: number;
  total: number;
  myVoteCharId: string | null;
}

export interface GroupResultDto {
  id: string;
  label: string;
  groupTotal: number;
  candidates: {
    charId: string;
    name: string;
    imageUrl: string;
    votes: number;
    pct: number;
  }[];
}

export interface MultiPollResultDto {
  poll: {
    id: string;
    anime: string;
    question: string;
    groups: MultiPollGroupDto[];
  };
  groups: GroupResultDto[];
  overallWinnerCharId: string | null;
  myVoteCharId: string | null;
}

export interface HistoryItemDto {
  pollId: string;
  pollType: 'single' | 'multi';
  anime: string;
  question: string;
  myVoteCharId: string;
  myVoteCharName: string;
  votedAt: string;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export interface RegisterRequest { username: string; email: string; password: string; }
export interface LoginRequest { username: string; password: string; }
export interface AuthResponse {
  token: string;
  userId: number;
  username: string;
  role: 'USER' | 'ADMIN';
}

// ── Admin CRUD ────────────────────────────────────────────────────────────────
export interface PollCreateDto {
  anime: string;
  question: string;
  fighter1Id: string;
  fighter2Id: string;
}

export interface PollDto {
  id: string;
  anime: string;
  question: string;
  fighter1: CharacterDto;
  fighter2: CharacterDto;
}

export interface MultiPollCreateDto {
  anime: string;
  question: string;
  groups: GroupCreateDto[];
}

export interface GroupCreateDto {
  label: string;
  characterIds: string[];
}

export interface MultiPollAdminDto {
  id: string;
  anime: string;
  question: string;
  groups: MultiPollGroupDto[];
}
