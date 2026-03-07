import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { AuthResponse } from '../../models';

const TOKEN_KEY = 'cc_google_id_token';
const USER_KEY = 'cc_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private token = signal<string | null>(this.getStoredToken());
  private user = signal<AuthResponse | null>(this.getStoredUser());

  readonly isAuthenticated = computed(() => !!this.token());
  readonly currentUser = computed(() => this.user());
  readonly isAdmin = computed(() => this.user()?.isAdmin ?? false);

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  getToken(): string | null {
    return this.token();
  }

  private getStoredToken(): string | null {
    try {
      return sessionStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }

  private getStoredUser(): AuthResponse | null {
    try {
      const raw = sessionStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  loginWithGoogle(idToken: string) {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/api/auth/google`, { idToken })
      .pipe(
        tap((res) => {
          this.token.set(idToken);
          this.user.set(res);
          sessionStorage.setItem(TOKEN_KEY, idToken);
          sessionStorage.setItem(USER_KEY, JSON.stringify(res));
        }),
        catchError((err) => {
          this.logout();
          throw err;
        })
      );
  }

  logout() {
    this.token.set(null);
    this.user.set(null);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    this.router.navigate(['/login']);
  }
}
