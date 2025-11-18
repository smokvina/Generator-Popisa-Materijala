import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GeminiService } from './services/gemini.service';
import { Materijal } from './materijal.interface';
import { LaborCost } from './labor-cost.interface';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule]
})
export class AppComponent {
  private geminiService = inject(GeminiService);

  userInput = signal('Moderan stan od 70m2 s dvije spavaće sobe, otvorenim konceptom dnevnog boravka i kuhinje, te jednom kupaonicom.');

  // State for Materials List
  materialsList = signal<Materijal[]>([]);
  loadingList = signal(false);
  errorList = signal<string | null>(null);

  // State for Project Analysis
  analysis = signal<string | null>(null);
  loadingAnalysis = signal(false);
  errorAnalysis = signal<string | null>(null);

  // State for Labor Costs
  laborCosts = signal<LaborCost[]>([]);
  loadingLaborCosts = signal(false);
  errorLaborCosts = signal<string | null>(null);

  totalCost = computed(() => {
    return this.materialsList().reduce((acc, item) => {
      const itemTotal = item.quantity * item.estimatedPricePerUnit;
      return acc + itemTotal;
    }, 0);
  });

  totalLaborCost = computed(() => {
    return this.laborCosts().reduce((acc, item) => {
      const itemTotal = item.kolicina * item.cijena_po_jedinici;
      return acc + itemTotal;
    }, 0);
  });
  
  grandTotal = computed(() => this.totalCost() + this.totalLaborCost());

  async generateList(): Promise<void> {
    if (!this.userInput().trim()) {
      this.errorList.set('Molimo unesite opis projekta.');
      return;
    }

    this.loadingList.set(true);
    this.materialsList.set([]);
    this.errorList.set(null);

    try {
      const result = await this.geminiService.generateBillOfMaterials(this.userInput());
      this.materialsList.set(result);
    } catch (e: unknown) {
      if (e instanceof Error) {
        this.errorList.set(e.message);
      } else {
        this.errorList.set('Došlo je do nepoznate greške.');
      }
    } finally {
      this.loadingList.set(false);
    }
  }

  async generateAnalysis(): Promise<void> {
    if (!this.userInput().trim()) {
      this.errorAnalysis.set('Molimo unesite opis projekta.');
      return;
    }

    this.loadingAnalysis.set(true);
    this.analysis.set(null);
    this.errorAnalysis.set(null);

    try {
      const result = await this.geminiService.generateProjectAnalysis(this.userInput());
      this.analysis.set(result);
    } catch (e: unknown) {
      if (e instanceof Error) {
        this.errorAnalysis.set(e.message);
      } else {
        this.errorAnalysis.set('Došlo je do nepoznate greške.');
      }
    } finally {
      this.loadingAnalysis.set(false);
    }
  }

  async generateLaborCosts(): Promise<void> {
    if (!this.userInput().trim()) {
      this.errorLaborCosts.set('Molimo unesite opis projekta.');
      return;
    }

    this.loadingLaborCosts.set(true);
    this.laborCosts.set([]);
    this.errorLaborCosts.set(null);

    try {
      const result = await this.geminiService.generateLaborCosts(this.userInput());
      this.laborCosts.set(result);
    } catch (e: unknown) {
      if (e instanceof Error) {
        this.errorLaborCosts.set(e.message);
      } else {
        this.errorLaborCosts.set('Došlo je do nepoznate greške.');
      }
    } finally {
      this.loadingLaborCosts.set(false);
    }
  }

  // Helper method for template binding
  onUserInput(event: Event) {
    const target = event.target as HTMLTextAreaElement;
    this.userInput.set(target.value);
  }

  getGroupedMaterials() {
    const grouped: { [key: string]: Materijal[] } = {};
    for (const item of this.materialsList()) {
      if (!grouped[item.category]) {
        grouped[item.category] = [];
      }
      grouped[item.category].push(item);
    }
    return Object.entries(grouped);
  }
}
