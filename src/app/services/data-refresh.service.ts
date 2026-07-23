import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DataRefreshService {
  private readonly _subject = new Subject<void>();
  readonly changes$ = this._subject.asObservable();
  notify(): void { this._subject.next(); }
}
