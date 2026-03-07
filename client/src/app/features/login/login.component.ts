import { Component, inject, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
          }) => void;
          renderButton: (element: HTMLElement, config: { theme?: string; size?: string; type?: string; text?: string }) => void;
        };
      };
    };
  }
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent implements AfterViewInit {
  @ViewChild('googleButton', { static: false }) googleButtonRef!: ElementRef<HTMLDivElement>;

  private auth = inject(AuthService);
  private router = inject(Router);

  loading = false;
  error: string | null = null;

  constructor() {
    if (this.auth.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
    }
  }

  ngAfterViewInit() {
    this.initGoogleSignIn();
  }

  private initGoogleSignIn() {
    const clientId = environment.googleClientId;
    if (!clientId) {
      this.error = 'Google Client ID is not configured. Set it in environment.';
      return;
    }
    if (typeof window.google === 'undefined') {
      const check = setInterval(() => {
        if (typeof window.google !== 'undefined') {
          clearInterval(check);
          this.renderButton(clientId);
        }
      }, 100);
      return;
    }
    this.renderButton(clientId);
  }

  private renderButton(clientId: string) {
    if (!this.googleButtonRef?.nativeElement) return;
    window.google?.accounts.id.initialize({
      client_id: clientId,
      callback: (res) => this.handleCredentialResponse(res),
      auto_select: false
    });
    window.google?.accounts.id.renderButton(this.googleButtonRef.nativeElement, {
      theme: 'outline',
      size: 'large',
      type: 'standard',
      text: 'signin_with'
    });
  }

  private handleCredentialResponse(response: { credential: string }) {
    this.loading = true;
    this.error = null;
    this.auth.loginWithGoogle(response.credential).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || err?.message || 'Login failed.';
      },
      complete: () => (this.loading = false)
    });
  }
}
