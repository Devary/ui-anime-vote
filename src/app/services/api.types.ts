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
  level: number;           // 0 = base candidates; 1+ = bracket level
  feederGroupIds: string[]; // ids of groups whose winners compete here (level 1+)
  resolved: boolean;        // false = waiting for feeder winners
  startDate?: string;
  endDate?: string;
  candidates: CharacterDto[];
}

export interface FighterResultDto {
  charId: string;
  name: string;
  imageUrl: string;
  votes: number;
  pct: number;
}

export interface PollResultDto {
  poll: PollDto;
  fighterResults: FighterResultDto[];
  total: number;
  myVoteCharId: string | null;
}

export interface GroupResultDto {
  id: string;
  label: string;
  level: number;
  feederGroupIds: string[];
  resolved: boolean;
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
  /** groupId → charId the user voted for */
  myVotesByGroup: { [groupId: string]: string };
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
export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}
export interface LoginRequest { username: string; password: string; }
export interface RefreshRequest { refreshToken: string; }
export interface LoginResponse {
  accessToken: string;
  refreshToken: string | null;
  tokenType: string;
  expiresIn: number;
  subject: string;
  username: string;
  email: string | null;
  roles: string[];
}

// ── Admin CRUD ────────────────────────────────────────────────────────────────
export interface PollCreateDto {
  anime: string;
  question: string;
  fighterIds: string[]; // 2-10 character IDs in order
}

export interface PollDto {
  id: string;
  anime: string;
  question: string;
  fighters: CharacterDto[];
}

export interface MultiPollCreateDto {
  anime: string;
  question: string;
  groups: GroupCreateDto[];
}

export interface GroupCreateDto {
  label: string;
  characterIds: string[];
  startNow: boolean;
  startDate?: string | null; // ISO-8601, absent when startNow=true
  endDate?: string | null;   // ISO-8601, required
}

export interface ServerTimeDto {
  now: string; // ISO-8601
}

export interface MultiPollAdminDto {
  id: string;
  anime: string;
  question: string;
  groups: MultiPollGroupDto[];
}

// ── Management CRUD ───────────────────────────────────────────────────────────
export interface AnimeDto {
  id: string;
  name: string;
  imageUrl: string | null;
}

export interface AnimeCreateDto {
  name: string;
  imageUrl: string | null;
}

export interface CharacterCreateDto {
  name: string;
  title: string;
  anime: string;
  imageUrl: string | null;
}

export interface UploadResponse {
  url: string;
}

// ── User management ───────────────────────────────────────────────────────────
export interface RoleDto {
  id: string;
  name: string;
  description: string | null;
}

export interface UserDto {
  id: string;
  username: string;
  email: string;
  profilePicture: string | null;
  createdAt: string;
  roles: RoleDto[];
}

export interface UserUpdateDto {
  email?: string;
  profilePicture?: string | null;
}

export interface AdminUserUpdateDto {
  email?: string;
  profilePicture?: string | null;
  roleIds?: string[];
}

export interface RoleCreateDto {
  id: string;
  name: string;
  description?: string;
}
