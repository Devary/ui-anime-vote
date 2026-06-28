import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  PollResultDto, MultiPollResultDto, HistoryItemDto,
  RegisterRequest, LoginRequest, RefreshRequest, LoginResponse,
  PollCreateDto, PollDto, MultiPollCreateDto, MultiPollAdminDto, CharacterDto,
  AnimeDto, AnimeCreateDto, CharacterCreateDto, UploadResponse, ServerTimeDto,
  UserDto, UserUpdateDto, AdminUserUpdateDto, RoleDto, RoleCreateDto
} from './api.types';
import { environment } from '../../environments/environment';

const API = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class AnimeApiService {
  private readonly http = inject(HttpClient);

  // ── Public listing ────────────────────────────────────────────────────────

  getPolls(): Observable<PollDto[]> {
    return this.http.get<PollDto[]>(`${API}/polls`);
  }

  getMultiPolls(): Observable<MultiPollAdminDto[]> {
    return this.http.get<MultiPollAdminDto[]>(`${API}/multi-polls`);
  }

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

  getServerTime(): Observable<ServerTimeDto> {
    return this.http.get<ServerTimeDto>(`${API}/server-time`);
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

  adminUpdateMultiPoll(id: string, req: MultiPollCreateDto): Observable<MultiPollAdminDto> {
    return this.http.put<MultiPollAdminDto>(`${API}/admin/multi-polls/${id}`, req);
  }

  // ── Admin CRUD — Anime ────────────────────────────────────────────────────

  adminGetAnimeList(): Observable<AnimeDto[]> {
    return this.http.get<AnimeDto[]>(`${API}/admin/anime`);
  }

  adminCreateAnime(req: AnimeCreateDto): Observable<AnimeDto> {
    return this.http.post<AnimeDto>(`${API}/admin/anime`, req);
  }

  adminUpdateAnime(id: string, req: AnimeCreateDto): Observable<AnimeDto> {
    return this.http.put<AnimeDto>(`${API}/admin/anime/${id}`, req);
  }

  adminDeleteAnime(id: string): Observable<void> {
    return this.http.delete<void>(`${API}/admin/anime/${id}`);
  }

  // ── Admin CRUD — Characters ───────────────────────────────────────────────

  adminGetAllCharacters(): Observable<CharacterDto[]> {
    return this.http.get<CharacterDto[]>(`${API}/admin/characters`);
  }

  adminCreateCharacter(req: CharacterCreateDto): Observable<CharacterDto> {
    return this.http.post<CharacterDto>(`${API}/admin/characters`, req);
  }

  adminUpdateCharacter(id: string, req: CharacterCreateDto): Observable<CharacterDto> {
    return this.http.put<CharacterDto>(`${API}/admin/characters/${id}`, req);
  }

  adminDeleteCharacter(id: string): Observable<void> {
    return this.http.delete<void>(`${API}/admin/characters/${id}`);
  }

  // ── Image Upload ──────────────────────────────────────────────────────────

  uploadImage(file: File): Observable<UploadResponse> {
    return this.uploadFileToPath(file, `${API}/admin/upload`);
  }

  uploadUserPicture(file: File): Observable<UploadResponse> {
    return this.uploadFileToPath(file, `${API}/user/upload`);
  }

  private uploadFileToPath(file: File, url: string): Observable<UploadResponse> {
    return new Observable(observer => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const commaIdx = dataUrl.indexOf(',');
        const data = dataUrl.substring(commaIdx + 1);
        this.http.post<UploadResponse>(url, { filename: file.name, mimeType: file.type || 'image/jpeg', data })
            .subscribe(observer);
      };
      reader.onerror = () => observer.error(new Error('FileReader error'));
      reader.readAsDataURL(file);
    });
  }

  // ── User profile ──────────────────────────────────────────────────────────

  getMyProfile(): Observable<UserDto> {
    return this.http.get<UserDto>(`${API}/user/me`);
  }

  updateMyProfile(dto: UserUpdateDto): Observable<UserDto> {
    return this.http.put<UserDto>(`${API}/user/me`, dto);
  }

  // ── Admin — Users ─────────────────────────────────────────────────────────

  adminGetUsers(): Observable<UserDto[]> {
    return this.http.get<UserDto[]>(`${API}/admin/users`);
  }

  adminUpdateUser(id: string, dto: AdminUserUpdateDto): Observable<UserDto> {
    return this.http.put<UserDto>(`${API}/admin/users/${id}`, dto);
  }

  adminDeleteUser(id: string): Observable<void> {
    return this.http.delete<void>(`${API}/admin/users/${id}`);
  }

  // ── Admin — Roles ─────────────────────────────────────────────────────────

  adminGetRoles(): Observable<RoleDto[]> {
    return this.http.get<RoleDto[]>(`${API}/admin/roles`);
  }

  adminCreateRole(dto: RoleCreateDto): Observable<RoleDto> {
    return this.http.post<RoleDto>(`${API}/admin/roles`, dto);
  }

  adminDeleteRole(id: string): Observable<void> {
    return this.http.delete<void>(`${API}/admin/roles/${id}`);
  }
}
