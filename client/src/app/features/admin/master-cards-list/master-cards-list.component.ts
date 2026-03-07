import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import type { MasterCard } from '../../../models';

@Component({
  selector: 'app-master-cards-list',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './master-cards-list.component.html',
  styleUrl: './master-cards-list.component.scss'
})
export class MasterCardsListComponent implements OnInit {
  private api = inject(ApiService);

  cards: MasterCard[] = [];
  loading = true;
  deletingId: string | null = null;

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading = true;
    this.api.getMasterCards().subscribe({
      next: (list) => {
        this.cards = list;
        this.loading = false;
      },
      error: () => (this.loading = false)
    });
  }

  delete(id: string) {
    if (!confirm('Delete this card and all its benefits?')) return;
    this.deletingId = id;
    this.api.deleteMasterCard(id).subscribe({
      next: () => this.load(),
      error: () => {},
      complete: () => (this.deletingId = null)
    });
  }
}
