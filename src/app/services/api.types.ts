export type ContentStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

/** Who can see (and vote on) a poll or multi-poll. */
export type Visibility = 'PUBLIC' | 'PRIVATE' | 'AUTHENTICATED' | 'RESTRICTED';

export interface UserDirectoryEntryDto {
  id: string;
  username: string;
}

export interface CharacterDto {
  id: string;
  name: string;
  title: string;
  anime: string;
  imageUrl: string;
  status?: ContentStatus;
  ownerId?: string | null;
  ownerUsername?: string | null;
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
  /** winner once the group's voting period ended; null while open, on tie, or no votes */
  winnerCharId?: string | null;
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
  winnerCharId?: string | null;
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
  myVoteCharImageUrl: string | null;
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
  isPrivate?: boolean;  // legacy; prefer visibility
  visibility?: Visibility;
  allowedUserIds?: string[]; // audience when visibility=RESTRICTED
}

export interface PollDto {
  id: string;
  anime: string;
  question: string;
  fighters: CharacterDto[];
  status?: ContentStatus;
  isPrivate?: boolean;
  visibility?: Visibility;
  allowedUserIds?: string[];
  ownerId?: string | null;
  ownerUsername?: string | null;
  deletePending?: boolean;
  commentsEnabled?: boolean;
  commentCount?: number;
  likes?: number;
  likedByMe?: boolean;
}

export interface MultiPollCreateDto {
  anime: string;
  question: string;
  isPrivate?: boolean;  // legacy; prefer visibility
  visibility?: Visibility;
  allowedUserIds?: string[]; // audience when visibility=RESTRICTED
  groups: GroupCreateDto[];
}

export interface GroupCreateDto {
  label: string;
  characterIds: string[];
  startNow: boolean;
  startDate?: string | null; // ISO-8601, absent when startNow=true
  endDate?: string | null;   // ISO-8601, required
  level?: number;            // 0 = QF; 1 = SF; 2 = GF
  feederIndices?: number[];  // indices into parent groups list for level > 0
}

export interface ServerTimeDto {
  now: string; // ISO-8601
}

export interface MultiPollAdminDto {
  id: string;
  anime: string;
  question: string;
  groups: MultiPollGroupDto[];
  status?: ContentStatus;
  isPrivate?: boolean;
  visibility?: Visibility;
  allowedUserIds?: string[];
  ownerId?: string | null;
  ownerUsername?: string | null;
  deletePending?: boolean;
  commentsEnabled?: boolean;
  commentCount?: number;
  likes?: number;
  likedByMe?: boolean;
}

// ── Approval system ───────────────────────────────────────────────────────────
export interface ApprovalItemDto {
  id: string;
  type: 'POLL' | 'MULTI_POLL' | 'CHARACTER' | 'ANIME';
  title: string;
  anime: string;
  ownerId: string;
  ownerUsername: string;
  createdAt: string;
  isDeletion: boolean;
}

export interface ApprovalSummaryDto {
  pendingContent: ApprovalItemDto[];
  pendingDeletions: ApprovalItemDto[];
}

export interface DailyLimitDto {
  charactersToday: number;
  pollsToday: number;
  multiPollsToday: number;
}

// ── Management CRUD ───────────────────────────────────────────────────────────
export interface AnimeDto {
  id: string;
  name: string;
  imageUrl: string | null;
  status?: ContentStatus;
  ownerId?: string | null;
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

// ── Audit trail ───────────────────────────────────────────────────────────────
export interface AuditEventDto {
  id: number;
  entityType: 'ANIME' | 'CHARACTER' | 'POLL' | 'MULTI_POLL';
  entityId: string;
  action: 'CREATED' | 'UPDATED' | 'DELETED' | 'APPROVED' | 'REJECTED' | 'RESTORED';
  userId: string | null;
  username: string | null;
  at: string;
  snapshot: string | null;
  restorable: boolean;
}

// ── Comments & likes ──────────────────────────────────────────────────────────
export interface CommentDto {
  id: string;
  username: string;
  text: string;
  createdAt: string;
  mine: boolean;
}

export interface LikeStateDto {
  likes: number;
  likedByMe: boolean;
}

/** REST prefix for social endpoints shared by both poll kinds */
export type PollKind = 'polls' | 'multi-polls';
