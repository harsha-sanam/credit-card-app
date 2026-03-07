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
  anniversaryDateInput = '';

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
    this.anniversaryDateInput = '';
  }

  closeDialog() {
    this.selectedCard = null;
    this.cardNameInput = '';
    this.anniversaryDateInput = '';
  }

  confirmAdd() {
    if (!this.selectedCard) return;
    // For anniversary-based cards, require anniversary date
    if (this.selectedCard.isAnniversaryBased && !this.anniversaryDateInput) {
      return;
    }
    this.addingId = this.selectedCard.id;
    const name = this.cardNameInput.trim() || this.selectedCard.cardName;
    const anniversaryDate = this.selectedCard.isAnniversaryBased ? this.anniversaryDateInput : undefined;
    this.api.addToWallet(this.selectedCard.id, name, anniversaryDate).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: () => (this.addingId = null),
      complete: () => (this.addingId = null)
    });
  }
}
