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
