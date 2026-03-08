import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { PeriodKeyService } from '../../core/services/period-key.service';
import type { UserCardWithMaster, Benefit, UsageRecord, BenefitFrequency } from '../../models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private periodKey = inject(PeriodKeyService);

  readonly currentYear = new Date().getFullYear();
  selectedYear = this.currentYear;
  availableYears: number[] = [this.currentYear];

  cards: UserCardWithMaster[] = [];
  loading = true;
  claimingId: string | null = null;
  summaryClaimingId: string | null = null;
  summaryDismissingId: string | null = null;

  // Available benefits summary (current period only, across all cards)
  // Sorted by last redeem date (asc), then by value (desc)
  availableBenefits: {
    userCardId: string;
    cardName: string;
    benefit: Benefit;
    periodKey: string;
    displayValue: string;
    lastRedeemDate: Date;
    numericValue: number;
  }[] = [];

  modalOpen = false;
  modalCard: UserCardWithMaster | null = null;
  modalBenefit: Benefit | null = null;
  modalPeriods: { periodKey: string; claimed: boolean; claimedAt?: string; claimable: boolean; note?: string }[] = [];
  modalClaimingKey: string | null = null;
  modalUnclaimingKey: string | null = null;
  modalSummary: { total: number; claimed: number; missed: number; claimedValue: number } | null = null;

  get user() {
    return this.auth.currentUser();
  }

  ngOnInit() {
    this.loadCards();
  }

  loadCards(refreshModal = false) {
    this.loading = true;
    this.api.getMyCards().subscribe({
      next: (list) => {
        this.cards = list;
        this.recomputeAvailableYears();
        this.rebuildAvailableBenefits();
        this.loading = false;
        if (refreshModal && this.modalOpen && this.modalCard) {
          const latest = this.cards.find((c) => c.userCard.id === this.modalCard?.userCard.id);
          if (latest) this.modalCard = latest;
          this.rebuildModalPeriods();
        }
      },
      error: () => (this.loading = false)
    });
  }

  onYearChange(value: string) {
    const y = Number.parseInt(value, 10);
    if (!Number.isFinite(y)) return;
    this.selectedYear = y;
    this.rebuildAvailableBenefits();
    if (this.modalOpen) this.rebuildModalPeriods();
  }

  private rebuildAvailableBenefits() {
    const result: {
      userCardId: string;
      cardName: string;
      benefit: Benefit;
      periodKey: string;
      displayValue: string;
      lastRedeemDate: Date;
      numericValue: number;
    }[] = [];

    // Only show current period benefits (not past unclaimed ones)
    for (const item of this.cards) {
      if (!item.masterCard) continue;
      const usages = item.userCard.benefitUsages ?? [];
      const dismissed = item.userCard.dismissedBenefits ?? [];

      for (const benefit of item.masterCard.benefits) {
        const freq = benefit.frequency as BenefitFrequency;
        const useAnniversaryYear = (item.masterCard.isAnniversaryBased && item.userCard.anniversaryDate) &&
          (freq === 'Yearly' || freq === 'CalendarYear');

        // For yearly on anniversary card use anniversary year as period key; else use calendar period
        let periodKey: string;
        if (useAnniversaryYear && item.userCard.anniversaryDate) {
          const annDate = new Date(item.userCard.anniversaryDate);
          const currentAnnYear = this.periodKey.getAnniversaryYearStart(annDate);
          periodKey = String(currentAnnYear);
        } else {
          periodKey = this.periodKey.getCurrentPeriodKey(freq);
        }

        // Check if already claimed for this period
        const isClaimed = usages.some((u) => u.benefitId === benefit.id && u.currentPeriodKey === periodKey);
        if (isClaimed) continue;

        // Check if dismissed for this period
        const isDismissed = dismissed.some((d) => d.benefitId === benefit.id && d.periodKey === periodKey);
        if (isDismissed) continue;

        const displayValue = this.periodKey.getDisplayValue(benefit, periodKey);
        const numericValue = parseFloat(displayValue.replace(/[^0-9.]/g, '')) || 0;

        // Only yearly benefits on anniversary cards use anniversary end date; others use end of month/quarter/half
        let lastRedeemDate: Date;
        if (useAnniversaryYear && item.userCard.anniversaryDate) {
          const annDate = new Date(item.userCard.anniversaryDate);
          const currentAnnYear = this.periodKey.getAnniversaryYearStart(annDate);
          const { end } = this.periodKey.getAnniversaryYearBounds(annDate, currentAnnYear);
          lastRedeemDate = end;
        } else {
          lastRedeemDate = this.getLastRedeemDate(periodKey, benefit.frequency as BenefitFrequency);
        }

        result.push({
          userCardId: item.userCard.id,
          cardName: item.userCard.cardName || item.masterCard.cardName,
          benefit,
          periodKey,
          displayValue,
          lastRedeemDate,
          numericValue
        });
      }
    }

    // Sort by last redeem date (ascending), then by value (descending)
    result.sort((a, b) => {
      const dateDiff = a.lastRedeemDate.getTime() - b.lastRedeemDate.getTime();
      if (dateDiff !== 0) return dateDiff;
      return b.numericValue - a.numericValue;
    });

    this.availableBenefits = result;
  }

  private getLastRedeemDate(periodKey: string, frequency: BenefitFrequency): Date {
    const year = parseInt(periodKey.slice(0, 4), 10);

    switch (frequency) {
      case 'Monthly': {
        const month = parseInt(periodKey.slice(5), 10);
        // Last day of the month
        return new Date(year, month, 0, 23, 59, 59);
      }
      case 'Quarterly': {
        const quarter = parseInt(periodKey.slice(6), 10);
        const endMonth = quarter * 3;
        return new Date(year, endMonth, 0, 23, 59, 59);
      }
      case 'HalfYearly': {
        const half = parseInt(periodKey.slice(6), 10);
        const endMonth = half * 6;
        return new Date(year, endMonth, 0, 23, 59, 59);
      }
      case 'Yearly':
      case 'CalendarYear':
        return new Date(year, 11, 31, 23, 59, 59);
      default:
        return new Date(year, 11, 31, 23, 59, 59);
    }
  }

  get availableBenefitsTotalValue(): number {
    let total = 0;
    for (const item of this.availableBenefits) {
      const num = parseFloat(item.displayValue.replace(/[^0-9.]/g, ''));
      if (!isNaN(num)) total += num;
    }
    return total;
  }

  claimFromSummary(item: typeof this.availableBenefits[0]) {
    this.summaryClaimingId = item.benefit.id + item.periodKey;
    this.api.claimBenefit(item.userCardId, item.benefit.id, item.periodKey).subscribe({
      next: () => {
        this.summaryClaimingId = null;
        this.loadCards();
      },
      error: () => (this.summaryClaimingId = null)
    });
  }

  dismissFromSummary(item: typeof this.availableBenefits[0]) {
    this.summaryDismissingId = item.benefit.id + item.periodKey;
    this.api.dismissBenefit(item.userCardId, item.benefit.id, item.periodKey).subscribe({
      next: () => {
        this.summaryDismissingId = null;
        this.loadCards();
      },
      error: () => (this.summaryDismissingId = null)
    });
  }

  private recomputeAvailableYears() {
    if (!this.cards.length) {
      this.availableYears = [this.currentYear];
      this.selectedYear = this.currentYear;
      return;
    }
    const yearSet = new Set<number>();
    const now = new Date();
    for (const c of this.cards) {
      const createdAt = new Date(c.userCard.createdAt || new Date().toISOString());
      const createdYear = isNaN(createdAt.getTime()) ? this.currentYear : createdAt.getFullYear();
      if (c.masterCard?.isAnniversaryBased && c.userCard.anniversaryDate) {
        const annDate = new Date(c.userCard.anniversaryDate);
        const currentAnnYear = this.periodKey.getAnniversaryYearStart(annDate, now);
        // First anniversary year that has started on or after card creation
        const firstAnnYear = this.periodKey.getAnniversaryYearStart(annDate, createdAt);
        const annInFirstYear = new Date(firstAnnYear, annDate.getMonth(), annDate.getDate());
        const firstValid = createdAt <= annInFirstYear ? firstAnnYear : firstAnnYear + 1;
        for (let y = currentAnnYear; y >= firstValid; y--) yearSet.add(y);
      } else {
        const min = createdYear - 1;
        for (let y = this.currentYear; y >= min; y--) yearSet.add(y);
      }
    }
    this.availableYears = Array.from(yearSet).sort((a, b) => b - a);
    if (!this.availableYears.length) {
      this.availableYears = [this.currentYear];
      this.selectedYear = this.currentYear;
    } else if (!this.availableYears.includes(this.selectedYear)) {
      this.selectedYear = this.availableYears[0];
    }
  }

  /** For anniversary cards + yearly only: use anniversary year as period key; else use calendar period. */
  getSelectedYearPeriodKey(frequency: BenefitFrequency, card?: UserCardWithMaster | null): string {
    const isAnn = card?.masterCard?.isAnniversaryBased && card?.userCard?.anniversaryDate;
    const yearlyOnAnn = isAnn && (frequency === 'Yearly' || frequency === 'CalendarYear');
    if (yearlyOnAnn) {
      return String(this.selectedYear);
    }
    return this.periodKey.getCurrentPeriodKeyForYear(frequency, this.selectedYear);
  }

  getBenefitDisplayValue(benefit: Benefit, periodKey: string): string {
    return this.periodKey.getDisplayValue(benefit, periodKey);
  }

  getFrequencyAbbrev(frequency: BenefitFrequency): string {
    switch (frequency) {
      case 'Monthly': return '/mo';
      case 'Quarterly': return '/qtr';
      case 'HalfYearly': return '/half';
      case 'Yearly': return '/yr';
      case 'CalendarYear': return '/yr';
      default: return '';
    }
  }

  formatBenefitValue(value: string): string {
    if (!value) return '';
    const num = value.replace(/[^0-9.]/g, '');
    return num ? `$${num}` : value;
  }

  formatPeriodKey(periodKey: string, frequency: BenefitFrequency): string {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const year = periodKey.slice(0, 4);

    switch (frequency) {
      case 'Monthly': {
        const monthNum = parseInt(periodKey.slice(5), 10);
        return `${monthNames[monthNum - 1]} ${year}`;
      }
      case 'Quarterly': {
        const q = periodKey.slice(6);
        const quarterRanges: Record<string, string> = { '1': 'Jan-Mar', '2': 'Apr-Jun', '3': 'Jul-Sep', '4': 'Oct-Dec' };
        return `Q${q} ${year} (${quarterRanges[q] || ''})`;
      }
      case 'HalfYearly': {
        const h = periodKey.slice(6);
        const halfRanges: Record<string, string> = { '1': 'Jan-Jun', '2': 'Jul-Dec' };
        return `H${h} ${year} (${halfRanges[h] || ''})`;
      }
      case 'Yearly':
      case 'CalendarYear':
        return `Year ${year}`;
      default:
        return periodKey;
    }
  }

  isUsed(benefit: Benefit, usages: UsageRecord[], card?: UserCardWithMaster | null): boolean {
    const key = this.getSelectedYearPeriodKey(benefit.frequency as BenefitFrequency, card);
    return usages.some((u) => u.benefitId === benefit.id && u.currentPeriodKey === key);
  }

  claim(userCardId: string, benefit: Benefit, card?: UserCardWithMaster | null) {
    const periodKey = this.getSelectedYearPeriodKey(benefit.frequency as BenefitFrequency, card);
    this.claimingId = benefit.id;
    this.api.claimBenefit(userCardId, benefit.id, periodKey).subscribe({
      next: () => this.loadCards(),
      error: () => {},
      complete: () => (this.claimingId = null)
    });
  }

  openBenefitHistory(card: UserCardWithMaster, benefit: Benefit) {
    this.modalOpen = true;
    this.modalCard = card;
    this.modalBenefit = benefit;
    this.rebuildModalPeriods();
  }

  /** True when the benefit history modal is showing anniversary-year periods (yearly on anniversary card). */
  get isModalShowingAnniversaryYear(): boolean {
    return !!(this.modalCard?.masterCard?.isAnniversaryBased && this.modalCard?.userCard?.anniversaryDate &&
      this.modalBenefit && (this.modalBenefit.frequency === 'Yearly' || this.modalBenefit.frequency === 'CalendarYear'));
  }

  closeModal() {
    this.modalOpen = false;
    this.modalCard = null;
    this.modalBenefit = null;
    this.modalPeriods = [];
    this.modalClaimingKey = null;
    this.modalUnclaimingKey = null;
    this.modalSummary = null;
  }

  private rebuildModalPeriods() {
    if (!this.modalCard || !this.modalBenefit) return;
    const now = new Date();
    let selectedStart: Date;
    let selectedEnd: Date;
    let allowedYears: Set<number>;

    const addedAt = new Date(this.modalCard.userCard.createdAt || new Date().toISOString());
    const isAnniversaryCard = !!(this.modalCard.masterCard?.isAnniversaryBased && this.modalCard.userCard.anniversaryDate);
    const freq = this.modalBenefit.frequency as BenefitFrequency;
    const useAnniversaryBounds = isAnniversaryCard && (freq === 'Yearly' || freq === 'CalendarYear');

    if (useAnniversaryBounds && this.modalCard.userCard.anniversaryDate) {
      const annDate = new Date(this.modalCard.userCard.anniversaryDate);
      const { start, end } = this.periodKey.getAnniversaryYearBounds(annDate, this.selectedYear);
      selectedStart = start;
      selectedEnd = this.selectedYear === this.periodKey.getAnniversaryYearStart(annDate, now) ? now : end;
      const currentAnnYear = this.periodKey.getAnniversaryYearStart(annDate, now);
      const firstAnnYear = this.periodKey.getAnniversaryYearStart(annDate, addedAt);
      const annInFirstYear = new Date(firstAnnYear, annDate.getMonth(), annDate.getDate());
      const firstValid = addedAt <= annInFirstYear ? firstAnnYear : firstAnnYear + 1;
      allowedYears = new Set<number>();
      for (let y = firstValid; y <= currentAnnYear; y++) allowedYears.add(y);
    } else {
      selectedEnd = this.selectedYear === this.currentYear ? now : new Date(this.selectedYear, 11, 31, 23, 59, 59);
      selectedStart = new Date(this.selectedYear, 0, 1);
      const addedYear = isNaN(addedAt.getTime()) ? this.currentYear : addedAt.getFullYear();
      allowedYears = new Set([addedYear, addedYear - 1]);
    }

    const keys = this.periodKey.getPeriodKeysBetween(this.modalBenefit.frequency as BenefitFrequency, selectedStart, selectedEnd);
    const usages = this.modalCard.userCard.benefitUsages ?? [];
    const nowYear = now.getFullYear();
    const nowMonth = now.getMonth() + 1;
    const nowQuarter = Math.floor((nowMonth - 1) / 3) + 1;
    const nowHalf = nowMonth <= 6 ? 1 : 2;

    const annDateForPeriod = useAnniversaryBounds && this.modalCard.userCard.anniversaryDate
      ? new Date(this.modalCard.userCard.anniversaryDate) : null;
    const addedYear = isNaN(addedAt.getTime()) ? this.currentYear : addedAt.getFullYear();
    const allowedYearsDesc = useAnniversaryBounds
      ? `Allowed anniversary years: ${Math.min(...allowedYears)}–${Math.max(...allowedYears)}`
      : `Allowed: ${addedYear - 1}–${addedYear}`;

    this.modalPeriods = keys
      .slice()
      .reverse()
      .map((k) => {
        const usage = usages.find((u) => u.benefitId === this.modalBenefit!.id && u.currentPeriodKey === k);
        const y = Number.parseInt(k.slice(0, 4), 10);
        const inAllowedYear = annDateForPeriod
          ? allowedYears.has(this.periodKey.getAnniversaryYearStartForPeriod(k, freq, annDateForPeriod))
          : allowedYears.has(y);

        let isFuture = false;
        if (y > nowYear) isFuture = true;
        if (y === nowYear) {
          if (k.includes('-')) {
            // monthly YYYY-MM, quarterly YYYY-Qn, half-year YYYY-Hn
            const suffix = k.slice(5);
            if (/^\d{2}$/.test(suffix)) {
              isFuture = Number.parseInt(suffix, 10) > nowMonth;
            } else if (/^Q[1-4]$/.test(suffix)) {
              isFuture = Number.parseInt(suffix.slice(1), 10) > nowQuarter;
            } else if (/^H[1-2]$/.test(suffix)) {
              isFuture = Number.parseInt(suffix.slice(1), 10) > nowHalf;
            }
          }
        }

        const claimable = inAllowedYear && !isFuture;
        const note = !inAllowedYear ? `Out of range (${allowedYearsDesc})` : isFuture ? 'Future period' : undefined;

        return {
          periodKey: k,
          claimed: !!usage,
          claimedAt: usage ? usage.lastUsedDate : undefined,
          claimable,
          note
        };
      });

    const claimed = this.modalPeriods.filter((p) => p.claimed).length;
    const total = this.modalPeriods.length;
    const missed = total - claimed;

    // Sum of claimed benefit values
    let claimedValue = 0;
    for (const p of this.modalPeriods) {
      if (p.claimed && this.modalBenefit) {
        const val = this.periodKey.getDisplayValue(this.modalBenefit, p.periodKey);
        const num = parseFloat(val.replace(/[^0-9.]/g, ''));
        if (!isNaN(num)) claimedValue += num;
      }
    }
    this.modalSummary = { total, claimed, missed, claimedValue };
  }

  claimForPeriod(periodKey: string) {
    if (!this.modalCard || !this.modalBenefit) return;
    const row = this.modalPeriods.find((p) => p.periodKey === periodKey);
    if (row && !row.claimable) return;
    this.modalClaimingKey = periodKey;
    this.api.claimBenefit(this.modalCard.userCard.id, this.modalBenefit.id, periodKey).subscribe({
      next: () => {
        this.modalClaimingKey = null;
        this.loadCards(true);
      },
      error: () => (this.modalClaimingKey = null)
    });
  }

  unclaimForPeriod(periodKey: string) {
    if (!this.modalCard || !this.modalBenefit) return;
    this.modalUnclaimingKey = periodKey;
    this.api.unclaimBenefit(this.modalCard.userCard.id, this.modalBenefit.id, periodKey).subscribe({
      next: () => {
        this.modalUnclaimingKey = null;
        this.loadCards(true);
      },
      error: () => (this.modalUnclaimingKey = null)
    });
  }

  confirmRemoveCard(item: UserCardWithMaster) {
    const cardName = item.userCard.cardName || item.masterCard?.cardName || 'this card';
    if (!confirm(`Remove "${cardName}" from your wallet? This will delete all benefit tracking history for this card.`)) {
      return;
    }
    this.api.removeFromWallet(item.userCard.id).subscribe({
      next: () => this.loadCards(),
      error: (err) => alert('Failed to remove card: ' + (err?.error?.message || err?.message || 'Unknown error'))
    });
  }

  logout() {
    this.auth.logout();
  }
}
