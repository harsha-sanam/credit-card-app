import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import type { MasterCard } from '../../models';

@Component({
  selector: 'app-add-card',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './add-card.component.html',
  styleUrl: './add-card.component.scss'
})
export class AddCardComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);

  masterCards: MasterCard[] = [];
  loading = true;
  addingId: string | null = null;

  selectedCard: MasterCard | null = null;
  cardNameInput = '';
  anniversaryMonth = '';
  anniversaryDay = '';

  readonly anniversaryMonths = [
    { value: '01', label: 'January' }, { value: '02', label: 'February' }, { value: '03', label: 'March' },
    { value: '04', label: 'April' }, { value: '05', label: 'May' }, { value: '06', label: 'June' },
    { value: '07', label: 'July' }, { value: '08', label: 'August' }, { value: '09', label: 'September' },
    { value: '10', label: 'October' }, { value: '11', label: 'November' }, { value: '12', label: 'December' }
  ];
  readonly anniversaryDays = Array.from({ length: 31 }, (_, i) => i + 1);

  ngOnInit() {
    this.api.getMasterCards().subscribe({
      next: (list) => {
        this.masterCards = list;
        this.loading = false;
      },
      error: () => (this.loading = false)
    });
  }

  openAddDialog(master: MasterCard) {
    this.selectedCard = master;
    this.cardNameInput = master.cardName;
    this.anniversaryMonth = '';
    this.anniversaryDay = '';
  }

  closeDialog() {
    this.selectedCard = null;
    this.cardNameInput = '';
    this.anniversaryMonth = '';
    this.anniversaryDay = '';
  }

  confirmAdd() {
    if (!this.selectedCard) return;
    // For anniversary-based cards, require month and day (no year)
    if (this.selectedCard.isAnniversaryBased && (!this.anniversaryMonth || !this.anniversaryDay)) {
      return;
    }
    this.addingId = this.selectedCard.id;
    const name = this.cardNameInput.trim() || this.selectedCard.cardName;
    // Store as 2000-MM-DD so only month/day are used; year is ignored
    let anniversaryDate: string | undefined;
    if (this.selectedCard.isAnniversaryBased && this.anniversaryMonth && this.anniversaryDay) {
      const day = String(Number(this.anniversaryDay)).padStart(2, '0');
      anniversaryDate = `2000-${this.anniversaryMonth}-${day}`;
    }
    this.api.addToWallet(this.selectedCard.id, name, anniversaryDate).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: () => (this.addingId = null),
      complete: () => (this.addingId = null)
    });
  }
}
