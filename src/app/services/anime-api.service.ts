import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  PollResultDto, MultiPollResultDto, HistoryItemDto,
  RegisterRequest, LoginRequest, RefreshRequest, LoginResponse,
  PollCreateDto, PollDto, MultiPollCreateDto, MultiPollAdminDto, CharacterDto
} from './api.types';
import { environment } from '../../environments/environment';

const API = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class AnimeApiService {
  private readonly http = inject(HttpClient);

  // ── Voting (identity from JWT or IP on backend) ───────────────────────────

  castVote(pollId: string, characterId: string): Observable<PollResultDto> {
    return this.http.post<PollResultDto>(`${API}/polls/${pollId}/vote`, { characterId });
  }

  changeVote(pollId: string, newCharacterId: string): Observable<PollResultDto> {
    return this.http.put<PollResultDto>(`${API}/polls/${pollId}/vote`, { newCharacterId });
  }

  getPollResult(pollId: string): Observable<PollResultDto> {
    return this.http.get<PollResultDto>(`${API}/polls/${pollId}`);
  }

  castMultiVote(pollId: string, characterId: string): Observable<MultiPollResultDto> {
    return this.http.post<MultiPollResultDto>(`${API}/multi-polls/${pollId}/vote`, { characterId });
  }

  changeMultiVote(pollId: string, newCharacterId: string): Observable<MultiPollResultDto> {
    return this.http.put<MultiPollResultDto>(`${API}/multi-polls/${pollId}/vote`, { newCharacterId });
  }

  getMultiPollResult(pollId: string): Observable<MultiPollResultDto> {
    return this.http.get<MultiPollResultDto>(`${API}/multi-polls/${pollId}`);
  }

  getHistory(date?: string): Observable<HistoryItemDto[]> {
    const params: Record<string, string> = {};
    if (date) params['date'] = date;
    return this.http.get<HistoryItemDto[]>(`${API}/history`, { params });
  }

  // ── Auth ──────────────────────────────────────────────────────────────────

  login(req: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${API}/auth/login`, req);
  }

  register(req: RegisterRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${API}/auth/register`, req);
  }

  refresh(req: RefreshRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${API}/auth/refresh`, req);
  }

  // ── Admin CRUD — Polls ────────────────────────────────────────────────────

  adminGetPolls(): Observable<PollDto[]> {
    return this.http.get<PollDto[]>(`${API}/admin/polls`);
  }

  adminGetCharacters(): Observable<CharacterDto[]> {
    return this.http.get<CharacterDto[]>(`${API}/admin/polls/characters`);
  }

  adminCreatePoll(req: PollCreateDto): Observable<PollDto> {
    return this.http.post<PollDto>(`${API}/admin/polls`, req);
  }

  adminUpdatePoll(id: string, req: PollCreateDto): Observable<PollDto> {
    return this.http.put<PollDto>(`${API}/admin/polls/${id}`, req);
  }

  adminDeletePoll(id: string): Observable<void> {
    return this.http.delete<void>(`${API}/admin/polls/${id}`);
  }

  // ── Admin CRUD — Multi-Polls ──────────────────────────────────────────────

  adminGetMultiPolls(): Observable<MultiPollAdminDto[]> {
    return this.http.get<MultiPollAdminDto[]>(`${API}/admin/multi-polls`);
  }

  adminCreateMultiPoll(req: MultiPollCreateDto): Observable<MultiPollAdminDto> {
    return this.http.post<MultiPollAdminDto>(`${API}/admin/multi-polls`, req);
  }

  adminDeleteMultiPoll(id: string): Observable<void> {
    return this.http.delete<void>(`${API}/admin/multi-polls/${id}`);
  }
}
