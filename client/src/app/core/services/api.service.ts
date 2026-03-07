import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { MasterCard, UserCard, UserCardWithMaster } from '../../models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private base = `${environment.apiUrl}/api`;

  constructor(private http: HttpClient) {}

  getMasterCards(): Observable<MasterCard[]> {
    return this.http.get<MasterCard[]>(`${this.base}/mastercards`);
  }

  getMasterCard(id: string): Observable<MasterCard> {
    return this.http.get<MasterCard>(`${this.base}/mastercards/${id}`);
  }

  createMasterCard(card: Omit<MasterCard, 'id'>): Observable<MasterCard> {
    return this.http.post<MasterCard>(`${this.base}/mastercards`, card);
  }

  updateMasterCard(card: MasterCard): Observable<void> {
    return this.http.put<void>(`${this.base}/mastercards/${card.id}`, card);
  }

  deleteMasterCard(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/mastercards/${id}`);
  }

  getMyCards(): Observable<UserCardWithMaster[]> {
    return this.http.get<UserCardWithMaster[]>(`${this.base}/usercards`);
  }

  getUserCard(id: string): Observable<UserCardWithMaster> {
    return this.http.get<UserCardWithMaster>(`${this.base}/usercards/${id}`);
  }

  addToWallet(masterCardId: string, cardName?: string, anniversaryDate?: string): Observable<UserCard> {
    return this.http.post<UserCard>(`${this.base}/usercards`, { masterCardId, cardName, anniversaryDate });
  }

  removeFromWallet(userCardId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/usercards/remove/${userCardId}`);
  }

  claimBenefit(userCardId: string, benefitId: string, periodKey?: string): Observable<void> {
    return this.http.post<void>(`${this.base}/usercards/${userCardId}/benefits/${benefitId}/claim`, periodKey ? { periodKey } : {});
  }

  unclaimBenefit(userCardId: string, benefitId: string, periodKey: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/usercards/${userCardId}/benefits/${benefitId}/claim/${encodeURIComponent(periodKey)}`);
  }

  dismissBenefit(userCardId: string, benefitId: string, periodKey: string): Observable<void> {
    return this.http.post<void>(`${this.base}/usercards/${userCardId}/benefits/${benefitId}/dismiss/${encodeURIComponent(periodKey)}`, {});
  }

  undismissBenefit(userCardId: string, benefitId: string, periodKey: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/usercards/${userCardId}/benefits/${benefitId}/dismiss/${encodeURIComponent(periodKey)}`);
  }
}
