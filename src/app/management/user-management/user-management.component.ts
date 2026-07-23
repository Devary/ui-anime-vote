import { Component, OnInit, ViewChild, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Table, TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AnimeApiService } from '../../services/anime-api.service';
import { ToastService } from '../../services/toast.service';
import { DataRefreshService } from '../../services/data-refresh.service';
import { UserDto, RoleDto, AdminUserUpdateDto, RoleCreateDto } from '../../services/api.types';
import { CrudModalComponent } from '../../shared/crud-modal/crud-modal.component';
import { ConfirmModalComponent } from '../../shared/confirm-modal/confirm-modal.component';

type SubTab = 'users' | 'roles';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule, TableModule, InputTextModule, IconFieldModule, InputIconModule, CrudModalComponent, ConfirmModalComponent],
  template: `
    <div class="section">

      <!-- Sub-tabs -->
      <div class="sub-tabs">
        <button class="sub-tab" [class.active]="subTab() === 'users'"  (click)="subTab.set('users')">Users</button>
        <button class="sub-tab" [class.active]="subTab() === 'roles'"  (click)="subTab.set('roles')">Roles</button>
      </div>

      <!-- ── USERS ──────────────────────────────────────────────────────────── -->
      @if (subTab() === 'users') {

        <p-table
          #dt
          [value]="users()"
          [paginator]="true"
          [rows]="10"
          [rowsPerPageOptions]="[10,25,50]"
          [globalFilterFields]="['username','email']"
          [loading]="loading()"
          sortMode="single"
          dataKey="id">

          <ng-template pTemplate="caption">
            <div class="table-caption">
              <p-iconfield>
                <p-inputicon styleClass="pi pi-search" />
                <input pInputText type="text"
                       (input)="dt.filterGlobal($any($event.target).value, 'contains')"
                       placeholder="Search users…" />
              </p-iconfield>
              <div class="caption-actions">
                <button class="btn-danger" type="button"
                        [disabled]="!selectedIds().size" (click)="delSelected()">
                  Remove Selected{{ selectedIds().size ? ' (' + selectedIds().size + ')' : '' }}
                </button>
              </div>
            </div>
          </ng-template>

          <ng-template pTemplate="header">
            <tr>
              <th style="width:3rem">
                <input type="checkbox" class="row-check"
                       [checked]="allSelected()" [indeterminate]="someSelected()"
                       (change)="toggleAll()" />
              </th>
              <th style="width:50px">Avatar</th>
              <th pSortableColumn="username">Username <p-sortIcon field="username" /></th>
              <th pSortableColumn="email">Email <p-sortIcon field="email" /></th>
              <th>Roles</th>
              <th pSortableColumn="createdAt">Created <p-sortIcon field="createdAt" /></th>
              <th style="width:90px">Actions</th>
            </tr>
          </ng-template>

          <ng-template pTemplate="body" let-u>
            <tr [class.row-selected]="selectedIds().has(u.id)">
              <td>
                <input type="checkbox" class="row-check"
                       [checked]="selectedIds().has(u.id)"
                       (change)="toggleRow(u.id)" />
              </td>
              <td>
                @if (u.profilePicture) {
                  <img class="avatar" [src]="u.profilePicture" [alt]="u.username" />
                } @else {
                  <div class="avatar-placeholder">{{ u.username[0].toUpperCase() }}</div>
                }
              </td>
              <td class="name-cell">{{ u.username }}</td>
              <td class="muted-cell">{{ u.email }}</td>
              <td>
                <div class="role-pills">
                  @for (r of u.roles; track r.id) {
                    <span class="role-pill" [class]="'role-' + r.id.toLowerCase()">{{ r.id }}</span>
                  }
                </div>
              </td>
              <td class="muted-cell">{{ u.createdAt | date:'yyyy-MM-dd' }}</td>
              <td class="actions-cell">
                <button class="btn-icon" (click)="startEdit(u)" title="Edit">
                  <i class="pi pi-pencil"></i>
                </button>
                <button class="btn-icon danger" (click)="delUser(u.id)" title="Delete">
                  <i class="pi pi-trash"></i>
                </button>
              </td>
            </tr>
          </ng-template>

          <ng-template pTemplate="emptymessage">
            <tr><td colspan="7">No users found.</td></tr>
          </ng-template>
        </p-table>
      }

      <!-- ── ROLES ──────────────────────────────────────────────────────────── -->
      @if (subTab() === 'roles') {
        <div class="roles-section">
          <div style="display:flex;justify-content:flex-end;">
            <button class="btn-primary" type="button" (click)="openNewRole()">+ Add Role</button>
          </div>
          <div class="roles-list">
            @for (role of allRoles(); track role.id) {
              <div class="role-row">
                <div class="role-info">
                  <span class="role-id-badge">{{ role.id }}</span>
                  <span class="role-name">{{ role.name }}</span>
                  @if (role.description) { <span class="role-desc">{{ role.description }}</span> }
                </div>
                <button class="btn-icon danger" (click)="delRole(role.id)" title="Delete role">
                  <i class="pi pi-trash"></i>
                </button>
              </div>
            }
            @if (allRoles().length === 0) {
              <div class="muted-cell">No roles found.</div>
            }
          </div>
        </div>
      }

      <!-- Edit user modal -->
      @if (showUserForm()) {
        <app-crud-modal [title]="'Edit user: ' + (editingUser()?.username ?? '')" (closeRequest)="onUserCloseRequest()">
          <form (ngSubmit)="requestSaveUser()">
            <div class="edit-grid">
              <label class="field">
                <span>Email</span>
                <input class="input" type="email" [(ngModel)]="editEmail" name="uemail"
                       (ngModelChange)="markUserDirty()" />
              </label>
              <label class="field">
                <span>Profile picture URL</span>
                <input class="input" type="text" [(ngModel)]="editPicture" name="upic"
                       placeholder="https://…" (ngModelChange)="markUserDirty()" />
              </label>
            </div>
            <div class="roles-assign">
              <span class="roles-label">Roles</span>
              <div class="roles-checkboxes">
                @for (role of allRoles(); track role.id) {
                  <label class="role-check-item">
                    <input type="checkbox"
                           [checked]="editRoleIds.has(role.id)"
                           (change)="toggleEditRole(role.id)" />
                    <span class="role-pill">{{ role.name }}</span>
                  </label>
                }
              </div>
            </div>
            @if (editError()) { <div class="error-msg">{{ editError() }}</div> }
            <div class="edit-actions">
              <button class="btn-ghost" type="button" (click)="onUserCloseRequest()">Cancel</button>
              <button class="btn-primary" type="submit" [disabled]="saving()">
                {{ saving() ? 'Saving…' : 'Save' }}
              </button>
            </div>
          </form>
        </app-crud-modal>
      }

      <!-- Create role modal -->
      @if (showRoleForm()) {
        <app-crud-modal title="Add Role" (closeRequest)="onRoleCloseRequest()">
          <form (ngSubmit)="requestCreateRole()">
            <div class="edit-grid">
              <label class="field">
                <span>ID (uppercase) *</span>
                <input class="input" [(ngModel)]="newRoleId" name="rid" placeholder="BETA"
                       (ngModelChange)="markRoleDirty()" />
              </label>
              <label class="field">
                <span>Display name *</span>
                <input class="input" [(ngModel)]="newRoleName" name="rname" placeholder="Beta Tester"
                       (ngModelChange)="markRoleDirty()" />
              </label>
              <label class="field span-2">
                <span>Description</span>
                <input class="input" [(ngModel)]="newRoleDesc" name="rdesc" placeholder="Optional description"
                       (ngModelChange)="markRoleDirty()" />
              </label>
            </div>
            @if (roleError()) { <div class="error-msg">{{ roleError() }}</div> }
            <div class="edit-actions">
              <button class="btn-ghost" type="button" (click)="onRoleCloseRequest()">Cancel</button>
              <button class="btn-primary" type="submit" [disabled]="savingRole()">
                {{ savingRole() ? 'Creating…' : '+ Create Role' }}
              </button>
            </div>
          </form>
        </app-crud-modal>
      }

      <!-- Confirm modal -->
      @if (showConfirm()) {
        <app-confirm-modal
          [title]="confirmTitle()"
          [message]="confirmMsg()"
          [danger]="isDanger()"
          (confirmed)="onConfirmed()"
          (cancelled)="onCancelled()" />
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .section { display: flex; flex-direction: column; gap: 1rem; }

    .sub-tabs { display: flex; gap: 0.5rem; border-bottom: 1px solid var(--rz-border); padding-bottom: 0.5rem; }
    .sub-tab { padding: 0.3rem 1rem; border: 1px solid var(--rz-border); border-radius: var(--rz-radius-sm);
                background: transparent; color: var(--rz-ink-muted); font-size: 0.8rem; cursor: pointer; }
    .sub-tab.active { background: var(--rz-primary); color: #fff; border-color: var(--rz-primary); }

    .edit-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
    .span-2 { grid-column: span 2; }
    .field { display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.8rem; color: var(--rz-ink-muted); }
    .input { padding: 0.4rem 0.6rem; border: 1px solid var(--rz-border); border-radius: var(--rz-radius-sm);
              background: var(--rz-glass-bg); color: var(--rz-ink); font-size: 0.82rem; }
    .input:focus { outline: none; border-color: var(--rz-primary); }

    .roles-assign { display: flex; flex-direction: column; gap: 0.4rem; }
    .roles-label { font-size: 0.8rem; font-weight: 600; color: var(--rz-ink-muted); }
    .roles-checkboxes { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .role-check-item { display: flex; align-items: center; gap: 0.35rem; cursor: pointer; font-size: 0.8rem; }

    .edit-actions { display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 0.25rem; }

    .table-caption { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; }
    .caption-actions { display: flex; gap: 0.5rem; }
    .row-check { width: 15px; height: 15px; cursor: pointer; accent-color: var(--rz-primary); }
    .row-selected td { background: rgba(21, 101, 192, 0.08); }

    .avatar { width: 34px; height: 34px; border-radius: 50%; object-fit: cover; border: 1px solid var(--rz-border); }
    .avatar-placeholder { width: 34px; height: 34px; border-radius: 50%; background: var(--rz-primary);
                           color: #fff; display: flex; align-items: center; justify-content: center;
                           font-size: 0.9rem; font-weight: 700; }
    .name-cell { font-weight: 600; }
    .muted-cell { color: var(--rz-ink-muted); font-size: 0.82rem; }
    .actions-cell { display: flex; gap: 0.4rem; }

    .role-pills { display: flex; flex-wrap: wrap; gap: 0.3rem; }
    .role-pill { font-size: 0.6rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase;
                  padding: 0.15rem 0.45rem; border-radius: var(--rz-radius-full);
                  background: var(--rz-surface-hover); color: var(--rz-ink-muted); border: 1px solid var(--rz-border); }
    .role-pill.role-admin    { background: rgba(239,68,68,0.12);  color: #ef4444; border-color: rgba(239,68,68,0.3); }
    .role-pill.role-moderator{ background: rgba(245,158,11,0.12); color: #f59e0b; border-color: rgba(245,158,11,0.3); }
    .role-pill.role-vip      { background: rgba(167,139,250,0.12);color: #a78bfa; border-color: rgba(167,139,250,0.3); }
    .role-pill.role-premium  { background: rgba(251,191,36,0.12); color: #fbbf24; border-color: rgba(251,191,36,0.3); }

    /* Roles section */
    .roles-section { display: flex; flex-direction: column; gap: 1rem; }
    .roles-list { display: flex; flex-direction: column; gap: 0.5rem; }
    .role-row { display: flex; align-items: center; justify-content: space-between;
                 background: var(--rz-glass-bg); border: 1px solid var(--rz-border);
                 border-radius: var(--rz-radius-sm); padding: 0.6rem 0.75rem; }
    .role-info { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; }
    .role-id-badge { font-size: 0.65rem; font-weight: 800; letter-spacing: 0.1em;
                      background: var(--rz-primary); color: #fff;
                      border-radius: var(--rz-radius-full); padding: 0.15rem 0.55rem; }
    .role-name { font-size: 0.85rem; font-weight: 600; }
    .role-desc { font-size: 0.75rem; color: var(--rz-ink-muted); }

    .error-msg { color: var(--rz-danger); font-size: 0.8rem; }
    .btn-primary { padding: 0.4rem 1rem; border-radius: var(--rz-radius-sm); border: none;
                    background: var(--rz-primary); color: #fff; font-size: 0.8rem; font-weight: 600; cursor: pointer; }
    .btn-primary:hover:not(:disabled) { opacity: 0.88; }
    .btn-primary:disabled { opacity: 0.5; cursor: default; }
    .btn-ghost { padding: 0.4rem 1rem; border-radius: var(--rz-radius-sm);
                  border: 1px solid var(--rz-border); background: transparent;
                  color: var(--rz-ink); font-size: 0.8rem; cursor: pointer; }
    .btn-ghost:hover { background: var(--rz-surface-hover); }
    .btn-danger { padding: 0.4rem 1rem; border-radius: var(--rz-radius-sm);
                   border: 1px solid var(--rz-danger); background: var(--rz-danger-bg);
                   color: var(--rz-danger); font-size: 0.8rem; font-weight: 600; cursor: pointer; }
    .btn-danger:hover:not(:disabled) { background: var(--rz-danger); color: #fff; }
    .btn-danger:disabled { opacity: 0.4; cursor: default; }
    .btn-icon { background: none; border: none; cursor: pointer; font-size: 0.9rem; padding: 0.3rem 0.4rem;
                 border-radius: var(--rz-radius-sm); color: var(--rz-ink-muted); }
    .btn-icon:hover { background: var(--rz-surface-hover); color: var(--rz-ink); }
    .btn-icon.danger:hover { background: var(--rz-danger-bg); color: var(--rz-danger); }
  `]
})
export class UserManagementComponent implements OnInit {
  @ViewChild('dt') dt!: Table;
  private readonly api     = inject(AnimeApiService);
  private readonly toast   = inject(ToastService);
  private readonly refresh = inject(DataRefreshService);

  readonly subTab  = signal<SubTab>('users');
  readonly loading = signal(false);
  readonly saving  = signal(false);

  readonly users    = signal<UserDto[]>([]);
  readonly allRoles = signal<RoleDto[]>([]);

  // ── Selection ──────────────────────────────────────────────────────────────
  readonly selectedIds = signal(new Set<string>());
  readonly allSelected = computed(() => this.users().length > 0 && this.selectedIds().size === this.users().length);
  readonly someSelected = computed(() => this.selectedIds().size > 0 && this.selectedIds().size < this.users().length);

  // ── Edit user modal ────────────────────────────────────────────────────────
  readonly showUserForm  = signal(false);
  readonly editingUser   = signal<UserDto | null>(null);
  readonly editError     = signal<string | null>(null);
  readonly isUserDirty   = signal(false);
  editEmail   = '';
  editPicture = '';
  editRoleIds = new Set<string>();

  markUserDirty(): void { this.isUserDirty.set(true); }

  // ── Roles form modal ───────────────────────────────────────────────────────
  readonly showRoleForm  = signal(false);
  readonly savingRole    = signal(false);
  readonly roleError     = signal<string | null>(null);
  readonly isRoleDirty   = signal(false);
  newRoleId   = '';
  newRoleName = '';
  newRoleDesc = '';

  markRoleDirty(): void { this.isRoleDirty.set(true); }

  // ── Confirm modal state ──────────────────────────────────────────────────────
  readonly showConfirm  = signal(false);
  readonly confirmTitle = signal('');
  readonly confirmMsg   = signal('');
  readonly isDanger     = signal(true);
  private confirmCb: () => void = () => {};

  private askConfirm(title: string, msg: string, cb: () => void, danger = true): void {
    this.confirmTitle.set(title); this.confirmMsg.set(msg);
    this.isDanger.set(danger); this.confirmCb = cb;
    this.showConfirm.set(true);
  }
  onConfirmed(): void { this.confirmCb(); this.showConfirm.set(false); }
  onCancelled(): void { this.showConfirm.set(false); }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    forkJoin({ users: this.api.adminGetUsers(), roles: this.api.adminGetRoles() }).subscribe({
      next: ({ users, roles }) => {
        this.users.set(users);
        this.allRoles.set(roles);
        this.loading.set(false);
      },
      error: e => { this.toast.error(this.msg(e)); this.loading.set(false); }
    });
  }

  // ── Selection ──────────────────────────────────────────────────────────────

  toggleRow(id: string): void {
    this.selectedIds.update(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  toggleAll(): void {
    if (this.allSelected()) { this.selectedIds.set(new Set()); }
    else { this.selectedIds.set(new Set(this.users().map(u => u.id))); }
  }

  // ── User edit modal ────────────────────────────────────────────────────────

  startEdit(u: UserDto): void {
    this.editingUser.set(u);
    this.editEmail   = u.email;
    this.editPicture = u.profilePicture ?? '';
    this.editRoleIds = new Set(u.roles.map(r => r.id));
    this.editError.set(null);
    this.isUserDirty.set(false);
    this.showUserForm.set(true);
  }

  onUserCloseRequest(): void {
    if (this.isUserDirty()) {
      this.askConfirm('Discard changes?', 'You have unsaved changes. Discard them?',
        () => this.closeUserForm(), false);
    } else { this.closeUserForm(); }
  }

  closeUserForm(): void {
    this.showUserForm.set(false);
    this.editingUser.set(null);
    this.editError.set(null);
    this.isUserDirty.set(false);
  }

  toggleEditRole(roleId: string): void {
    const s = new Set(this.editRoleIds);
    s.has(roleId) ? s.delete(roleId) : s.add(roleId);
    this.editRoleIds = s;
    this.isUserDirty.set(true);
  }

  requestSaveUser(): void {
    const u = this.editingUser();
    if (!u) return;
    this.askConfirm('Save changes?', 'Save the changes to this user?',
      () => this.doSaveUser(), false);
  }

  private doSaveUser(): void {
    const u = this.editingUser();
    if (!u) return;
    this.saving.set(true);
    this.editError.set(null);
    const dto: AdminUserUpdateDto = {
      email:          this.editEmail || undefined,
      profilePicture: this.editPicture || null,
      roleIds:        [...this.editRoleIds]
    };
    this.api.adminUpdateUser(u.id, dto).subscribe({
      next: () => {
        this.saving.set(false);
        this.closeUserForm();
        this.toast.success('User updated');
        this.load();
      },
      error: e => { this.saving.set(false); this.editError.set(this.msg(e)); }
    });
  }

  delUser(id: string): void {
    this.askConfirm('Delete user?', 'This will delete the user and all their votes. This action cannot be undone.',
      () => this.doDeleteUser(id));
  }

  private doDeleteUser(id: string): void {
    this.api.adminDeleteUser(id).subscribe({
      next: () => {
        this.toast.success('User deleted');
        this.load();
      },
      error: e => this.toast.error(this.msg(e))
    });
  }

  delSelected(): void {
    const ids = [...this.selectedIds()];
    if (!ids.length) return;
    this.askConfirm(`Delete ${ids.length} users?`, 'This will delete the selected users and all their votes. This action cannot be undone.',
      () => this.doBulkDeleteUsers(ids));
  }

  private doBulkDeleteUsers(ids: string[]): void {
    forkJoin(ids.map(id => this.api.adminDeleteUser(id).pipe(
      map(() => id as string | null), catchError(() => of(null))
    ))).subscribe(results => {
      const deleted = results.filter((r): r is string => r !== null);
      this.toast.success(`Deleted ${deleted.length}/${ids.length} users`);
      this.selectedIds.set(new Set());
      this.load();
    });
  }

  // ── Role create modal ──────────────────────────────────────────────────────

  openNewRole(): void {
    this.newRoleId = ''; this.newRoleName = ''; this.newRoleDesc = '';
    this.roleError.set(null);
    this.isRoleDirty.set(false);
    this.showRoleForm.set(true);
  }

  onRoleCloseRequest(): void {
    if (this.isRoleDirty()) {
      this.askConfirm('Discard changes?', 'You have unsaved changes. Discard them?',
        () => this.closeRoleForm(), false);
    } else { this.closeRoleForm(); }
  }

  closeRoleForm(): void {
    this.showRoleForm.set(false);
    this.roleError.set(null);
    this.isRoleDirty.set(false);
  }

  requestCreateRole(): void {
    if (!this.newRoleId.trim() || !this.newRoleName.trim()) {
      this.roleError.set('ID and name are required'); return;
    }
    this.askConfirm('Create role?', `Create role "${this.newRoleId.trim()}"?`,
      () => this.doCreateRole(), false);
  }

  private doCreateRole(): void {
    this.savingRole.set(true);
    this.roleError.set(null);
    const dto: RoleCreateDto = { id: this.newRoleId.trim(), name: this.newRoleName.trim(), description: this.newRoleDesc };
    this.api.adminCreateRole(dto).subscribe({
      next: role => {
        this.savingRole.set(false);
        this.toast.success(`Role "${role.id}" created`);
        this.closeRoleForm();
        this.load();
      },
      error: e => { this.savingRole.set(false); this.roleError.set(this.msg(e)); }
    });
  }

  delRole(id: string): void {
    this.askConfirm(`Delete role "${id}"?`, 'It will be removed from all users. This action cannot be undone.',
      () => this.doDeleteRole(id));
  }

  private doDeleteRole(id: string): void {
    this.api.adminDeleteRole(id).subscribe({
      next: () => {
        this.toast.success(`Role "${id}" deleted`);
        this.load();
      },
      error: e => this.toast.error(this.msg(e))
    });
  }

  private msg(e: any): string { return e?.error?.message ?? e?.message ?? 'Request failed'; }
}
