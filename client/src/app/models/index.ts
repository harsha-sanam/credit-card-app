export type BenefitFrequency = 'Monthly' | 'HalfYearly' | 'Quarterly' | 'Yearly' | 'CalendarYear';

export interface PeriodValueOverride {
  periodSubKey: string; // e.g. "12" for December, "4" for Q4, "2" for H2
  value: string;
}

export interface Benefit {
  id: string;
  name: string;
  value: string;
  frequency: BenefitFrequency;
  description?: string;
  periodValueOverrides?: PeriodValueOverride[];
}

export interface MasterCard {
  id: string;
  cardName: string;
  bank: string;
  annualFee: number;
  isAnniversaryBased: boolean;
  benefits: Benefit[];
}

export interface UserProfile {
  id: string;
  googleSubId: string;
  email: string;
  displayName?: string;
}

export interface UsageRecord {
  benefitId: string;
  lastUsedDate: string;
  currentPeriodKey: string;
}

export interface DismissedBenefit {
  benefitId: string;
  periodKey: string;
  dismissedAt: string;
}

export interface UserCard {
  id: string;
  userId: string;
  masterCardId: string;
  cardName?: string;
  createdAt: string;
  anniversaryDate?: string;
  benefitUsages: UsageRecord[];
  dismissedBenefits: DismissedBenefit[];
}

export interface UserCardWithMaster {
  userCard: UserCard;
  masterCard: MasterCard | null;
}

export interface AuthResponse {
  userId: string;
  email: string;
  displayName?: string;
  isAdmin: boolean;
}
