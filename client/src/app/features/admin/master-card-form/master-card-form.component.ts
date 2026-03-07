import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormArray, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import type { MasterCard, Benefit, BenefitFrequency } from '../../../models';

const FREQUENCIES: BenefitFrequency[] = ['Monthly', 'HalfYearly', 'Quarterly', 'Yearly', 'CalendarYear'];

const MONTH_LABELS: { key: string; label: string }[] = [
  { key: '1', label: 'January' }, { key: '2', label: 'February' }, { key: '3', label: 'March' },
  { key: '4', label: 'April' }, { key: '5', label: 'May' }, { key: '6', label: 'June' },
  { key: '7', label: 'July' }, { key: '8', label: 'August' }, { key: '9', label: 'September' },
  { key: '10', label: 'October' }, { key: '11', label: 'November' }, { key: '12', label: 'December' }
];
const QUARTER_LABELS = [ { key: '1', label: 'Q1' }, { key: '2', label: 'Q2' }, { key: '3', label: 'Q3' }, { key: '4', label: 'Q4' } ];
const HALF_LABELS = [ { key: '1', label: 'H1 (Jan–Jun)' }, { key: '2', label: 'H2 (Jul–Dec)' } ];

@Component({
  selector: 'app-master-card-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './master-card-form.component.html',
  styleUrl: './master-card-form.component.scss'
})
export class MasterCardFormComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);

  form: FormGroup = this.fb.group({
    cardName: ['', Validators.required],
    bank: ['', Validators.required],
    annualFee: [0, [Validators.required, Validators.min(0)]],
    isAnniversaryBased: [false],
    benefits: this.fb.array([])
  });

  id: string | null = null;
  loading = false;
  saving = false;
  frequencies = FREQUENCIES;

  get benefits(): FormArray {
    return this.form.get('benefits') as FormArray;
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'new') {
      this.id = id;
      this.loading = true;
      this.api.getMasterCard(id).subscribe({
        next: (card) => {
          this.form.patchValue({
            cardName: card.cardName,
            bank: card.bank,
            annualFee: card.annualFee,
            isAnniversaryBased: card.isAnniversaryBased ?? false
          });
          this.benefits.clear();
          card.benefits.forEach((b) => this.addBenefit(b));
          this.loading = false;
        },
        error: () => (this.loading = false)
      });
    }
  }

  addBenefit(b?: Benefit) {
    const overrides = this.fb.array(
      (b?.periodValueOverrides ?? []).map((o) => this.fb.group({ periodSubKey: [o.periodSubKey], value: [o.value] }))
    );
    this.benefits.push(
      this.fb.group({
        id: [b?.id ?? crypto.randomUUID()],
        name: [b?.name ?? '', Validators.required],
        value: [b?.value ?? ''],
        frequency: [b?.frequency ?? 'Monthly'],
        description: [b?.description ?? ''],
        periodValueOverrides: overrides,
        newOverrideSubKey: [''],
        newOverrideValue: ['']
      })
    );
  }

  getOverrides(benefitIndex: number): FormArray {
    return (this.benefits.at(benefitIndex)?.get('periodValueOverrides') as FormArray) ?? this.fb.array([]);
  }

  addOverride(benefitIndex: number, periodSubKey: string, value: string) {
    const overrides = this.getOverrides(benefitIndex);
    overrides.push(this.fb.group({ periodSubKey: [periodSubKey], value: [value || ''] }));
  }

  removeOverride(benefitIndex: number, overrideIndex: number) {
    this.getOverrides(benefitIndex).removeAt(overrideIndex);
  }

  getOverrideOptions(frequency: BenefitFrequency, benefitIndex: number): { key: string; label: string }[] {
    const existing = (this.getOverrides(benefitIndex).value as { periodSubKey: string }[]).map((o) => o.periodSubKey);
    let list: { key: string; label: string }[];
    switch (frequency) {
      case 'Monthly': list = MONTH_LABELS; break;
      case 'Quarterly': list = QUARTER_LABELS; break;
      case 'HalfYearly': list = HALF_LABELS; break;
      case 'Yearly':
      case 'CalendarYear': list = [{ key: '1', label: 'Year' }]; break;
      default: list = [];
    }
    return list.filter((opt) => !existing.includes(opt.key));
  }

  addOverrideFromPending(benefitIndex: number) {
    const g = this.benefits.at(benefitIndex);
    const subKey = g?.get('newOverrideSubKey')?.value;
    const value = g?.get('newOverrideValue')?.value ?? '';
    if (subKey) {
      this.addOverride(benefitIndex, subKey, value);
      g?.patchValue({ newOverrideSubKey: '', newOverrideValue: '' });
    }
  }

  getPeriodLabel(frequency: BenefitFrequency, periodSubKey: string): string {
    switch (frequency) {
      case 'Monthly': return MONTH_LABELS.find((m) => m.key === periodSubKey)?.label ?? periodSubKey;
      case 'Quarterly': return QUARTER_LABELS.find((q) => q.key === periodSubKey)?.label ?? periodSubKey;
      case 'HalfYearly': return HALF_LABELS.find((h) => h.key === periodSubKey)?.label ?? periodSubKey;
      default: return periodSubKey;
    }
  }

  removeBenefit(i: number) {
    this.benefits.removeAt(i);
  }

  submit() {
    if (this.form.invalid) return;
    this.saving = true;
    const raw = this.form.getRawValue();
    const card: MasterCard = {
      id: this.id ?? '',
      cardName: raw.cardName,
      bank: raw.bank,
      annualFee: Number(raw.annualFee),
      isAnniversaryBased: raw.isAnniversaryBased ?? false,
      benefits: raw.benefits.map((b: { id: string; name: string; value: string; frequency: BenefitFrequency; description: string; periodValueOverrides?: { periodSubKey: string; value: string }[] }) => ({
        id: b.id,
        name: b.name,
        value: b.value,
        frequency: b.frequency,
        description: b.description || undefined,
        periodValueOverrides: (b.periodValueOverrides?.length ? b.periodValueOverrides : undefined)
      }))
    };
    if (this.id) {
      this.api.updateMasterCard(card).subscribe({
        next: () => this.router.navigate(['/admin/cards']),
        error: () => {},
        complete: () => (this.saving = false)
      });
    } else {
      this.api.createMasterCard({ cardName: card.cardName, bank: card.bank, annualFee: card.annualFee, isAnniversaryBased: card.isAnniversaryBased, benefits: card.benefits }).subscribe({
        next: () => this.router.navigate(['/admin/cards']),
        error: () => {},
        complete: () => (this.saving = false)
      });
    }
  }
}
