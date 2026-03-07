import { Injectable } from '@angular/core';
import type { Benefit, BenefitFrequency } from '../../models';

@Injectable({ providedIn: 'root' })
export class PeriodKeyService {
  getCurrentPeriodKey(frequency: BenefitFrequency, referenceDate: Date = new Date()): string {
    const d = referenceDate;
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    switch (frequency) {
      case 'Monthly':
        return `${year}-${String(month).padStart(2, '0')}`;
      case 'HalfYearly':
        return `${year}-H${month <= 6 ? 1 : 2}`;
      case 'Quarterly':
        const q = Math.floor((month - 1) / 3) + 1;
        return `${year}-Q${q}`;
      case 'Yearly':
      case 'CalendarYear':
        return String(year);
      default:
        return String(year);
    }
  }

  /**
   * Builds a "current period key" but forces the year to the selected year.
   * Example (today=March): Monthly->YYYY-03, Quarterly->YYYY-Q1, HalfYearly->YYYY-H1.
   */
  getCurrentPeriodKeyForYear(frequency: BenefitFrequency, selectedYear: number, referenceDate: Date = new Date()): string {
    const d = referenceDate;
    const month = d.getMonth() + 1;
    switch (frequency) {
      case 'Monthly':
        return `${selectedYear}-${String(month).padStart(2, '0')}`;
      case 'Quarterly': {
        const q = Math.floor((month - 1) / 3) + 1;
        return `${selectedYear}-Q${q}`;
      }
      case 'HalfYearly':
        return `${selectedYear}-H${month <= 6 ? 1 : 2}`;
      case 'Yearly':
      case 'CalendarYear':
        return String(selectedYear);
      default:
        return String(selectedYear);
    }
  }

  getPeriodKeysBetween(frequency: BenefitFrequency, startDate: Date, endDate: Date): string[] {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return [];
    if (start > end) return [];

    const keys: string[] = [];

    const pushUnique = (k: string) => {
      if (keys.length === 0 || keys[keys.length - 1] !== k) keys.push(k);
    };

    switch (frequency) {
      case 'Monthly': {
        // Use local date math to avoid UTC offset shifting the year/month (e.g. showing 2025-H2 for 2026-H1)
        let d = new Date(start.getFullYear(), start.getMonth(), 1);
        const limit = new Date(end.getFullYear(), end.getMonth(), 1);
        while (d <= limit) {
          pushUnique(this.getCurrentPeriodKey('Monthly', new Date(d)));
          d = new Date(d.getFullYear(), d.getMonth() + 1, 1);
        }
        break;
      }
      case 'Quarterly': {
        const quarterStartMonth = (m: number) => Math.floor(m / 3) * 3;
        let d = new Date(start.getFullYear(), quarterStartMonth(start.getMonth()), 1);
        const limit = new Date(end.getFullYear(), quarterStartMonth(end.getMonth()), 1);
        while (d <= limit) {
          pushUnique(this.getCurrentPeriodKey('Quarterly', new Date(d)));
          d = new Date(d.getFullYear(), d.getMonth() + 3, 1);
        }
        break;
      }
      case 'HalfYearly': {
        const halfStartMonth = (m: number) => (m < 6 ? 0 : 6);
        let d = new Date(start.getFullYear(), halfStartMonth(start.getMonth()), 1);
        const limit = new Date(end.getFullYear(), halfStartMonth(end.getMonth()), 1);
        while (d <= limit) {
          pushUnique(this.getCurrentPeriodKey('HalfYearly', new Date(d)));
          d = new Date(d.getFullYear(), d.getMonth() + 6, 1);
        }
        break;
      }
      case 'Yearly':
      case 'CalendarYear': {
        let y = start.getFullYear();
        const yEnd = end.getFullYear();
        while (y <= yEnd) {
          pushUnique(String(y));
          y++;
        }
        break;
      }
      default:
        break;
    }

    return keys;
  }

  /**
   * Extracts the period sub-key from a period key for override lookup.
   * Monthly "2026-12" -> "12", Quarterly "2026-Q4" -> "4", HalfYearly "2026-H2" -> "2", Yearly "2026" -> "1".
   */
  getSubKeyFromPeriodKey(periodKey: string, frequency: BenefitFrequency): string {
    switch (frequency) {
      case 'Monthly': {
        const dash = periodKey.indexOf('-');
        return dash >= 0 ? periodKey.slice(dash + 1) : periodKey; // "2026-12" -> "12"
      }
      case 'Quarterly':
        return periodKey.includes('-Q') ? periodKey.replace(/^\d{4}-Q/, '') : periodKey; // "2026-Q4" -> "4"
      case 'HalfYearly':
        return periodKey.includes('-H') ? periodKey.replace(/^\d{4}-H/, '') : periodKey; // "2026-H2" -> "2"
      case 'Yearly':
      case 'CalendarYear':
        return '1'; // single period per year
      default:
        return periodKey;
    }
  }

  /**
   * Returns the display value for a benefit in a given period (default or period override).
   */
  getDisplayValue(benefit: Benefit, periodKey: string): string {
    const overrides = benefit.periodValueOverrides;
    if (overrides?.length) {
      const subKey = this.getSubKeyFromPeriodKey(periodKey, benefit.frequency);
      // For monthly, subKey is "01".."12" but override might be stored as "1".."12"
      // Normalize both to compare: strip leading zeros
      const normalizedSubKey = subKey.replace(/^0+/, '') || '0';
      const override = overrides.find((o) => {
        const normalizedOverride = o.periodSubKey.replace(/^0+/, '') || '0';
        return normalizedOverride === normalizedSubKey;
      });
      if (override) return override.value;
    }
    return benefit.value;
  }
}
