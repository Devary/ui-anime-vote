import { Component, ElementRef, ViewChild, inject, model, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AnimeApiService } from '../../services/anime-api.service';
import { ToastService } from '../../services/toast.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-image-upload',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="img-upload">
      @if (imageUrl()) {
        <div class="preview-wrap">
          <img class="preview" [src]="imageUrl()" alt="preview" (error)="onImgError($event)" />
          <button class="clear-btn" type="button" (click)="clear()" title="Remove image">✕</button>
        </div>
      }
      <div class="input-row">
        <button class="upload-btn" type="button" (click)="fileInput.click()" [disabled]="uploading()">
          {{ uploading() ? 'Uploading…' : '↑ Upload' }}
        </button>
        <input class="url-input" type="text" [value]="imageUrl() ?? ''"
               (input)="onUrlInput($event)" placeholder="or paste image URL…" />
        <input #fileInput type="file" accept="image/*" hidden (change)="onFileSelected($event)" />
      </div>
    </div>
  `,
  styles: [`
    .img-upload { display: flex; flex-direction: column; gap: 0.5rem; }
    .preview-wrap { position: relative; display: inline-block; width: 96px; height: 96px; }
    .preview { width: 96px; height: 96px; object-fit: cover; border-radius: var(--rz-radius-sm);
                border: 1px solid var(--rz-border); }
    .clear-btn { position: absolute; top: -6px; right: -6px; width: 18px; height: 18px;
                  border-radius: 50%; border: none; background: var(--rz-danger); color: #fff;
                  font-size: 0.6rem; cursor: pointer; display: flex; align-items: center;
                  justify-content: center; padding: 0; line-height: 1; }
    .input-row { display: flex; gap: 0.5rem; align-items: center; }
    .upload-btn { flex-shrink: 0; padding: 0.35rem 0.75rem; border-radius: var(--rz-radius-sm);
                   border: 1px solid var(--rz-primary); background: transparent; color: var(--rz-primary);
                   font-size: 0.78rem; font-weight: 600; cursor: pointer; white-space: nowrap; }
    .upload-btn:hover:not(:disabled) { background: var(--rz-surface-hover); }
    .upload-btn:disabled { opacity: 0.5; cursor: default; }
    .url-input { flex: 1; min-width: 0; padding: 0.35rem 0.6rem; border-radius: var(--rz-radius-sm);
                  border: 1px solid var(--rz-border); background: var(--rz-surface);
                  color: var(--rz-ink); font-size: 0.78rem; }
    .url-input:focus { outline: none; border-color: var(--rz-primary); }
  `]
})
export class ImageUploadComponent {
  readonly imageUrl = model<string | null>(null);
  readonly uploading = signal(false);

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  private readonly api = inject(AnimeApiService);
  private readonly toast = inject(ToastService);
  private readonly apiUrl = environment.apiUrl;

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.uploading.set(true);
    this.api.uploadImage(file).subscribe({
      next: res => {
        this.imageUrl.set(this.apiUrl + res.url);
        this.uploading.set(false);
      },
      error: e => {
        this.toast.error(e?.error?.message ?? 'Upload failed');
        this.uploading.set(false);
      }
    });
    (event.target as HTMLInputElement).value = '';
  }

  onUrlInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.imageUrl.set(val || null);
  }

  onImgError(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }

  clear(): void {
    this.imageUrl.set(null);
  }
}
