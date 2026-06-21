import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PollResultDto, MultiPollResultDto, HistoryItemDto } from './api.types';

const API_BASE = 'http://localhost:5556';

@Injectable({ providedIn: 'root' })
export class AnimeApiService {
  private readonly http = inject(HttpClient);

  castVote(pollId: string, characterId: string, sessionId: string): Observable<PollResultDto> {
    return this.http.post<PollResultDto>(
      `${API_BASE}/polls/${pollId}/vote`,
      { characterId, sessionId }
    );
  }

  changeVote(pollId: string, newCharacterId: string, sessionId: string): Observable<PollResultDto> {
    return this.http.put<PollResultDto>(
      `${API_BASE}/polls/${pollId}/vote`,
      { newCharacterId, sessionId }
    );
  }

  getPollResult(pollId: string, sessionId: string): Observable<PollResultDto> {
    return this.http.get<PollResultDto>(
      `${API_BASE}/polls/${pollId}`,
      { params: { sessionId } }
    );
  }

  castMultiVote(pollId: string, characterId: string, sessionId: string): Observable<MultiPollResultDto> {
    return this.http.post<MultiPollResultDto>(
      `${API_BASE}/multi-polls/${pollId}/vote`,
      { characterId, sessionId }
    );
  }

  changeMultiVote(pollId: string, newCharacterId: string, sessionId: string): Observable<MultiPollResultDto> {
    return this.http.put<MultiPollResultDto>(
      `${API_BASE}/multi-polls/${pollId}/vote`,
      { newCharacterId, sessionId }
    );
  }

  getMultiPollResult(pollId: string, sessionId: string): Observable<MultiPollResultDto> {
    return this.http.get<MultiPollResultDto>(
      `${API_BASE}/multi-polls/${pollId}`,
      { params: { sessionId } }
    );
  }

  getHistory(sessionId: string, date?: string): Observable<HistoryItemDto[]> {
    const params: Record<string, string> = { sessionId };
    if (date) params['date'] = date;
    return this.http.get<HistoryItemDto[]>(`${API_BASE}/history`, { params });
  }
}
