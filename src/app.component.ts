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

  // State for Operational Summary
  summary = signal<string | null>(null);
  loadingSummary = signal(false);
  errorSummary = signal<string | null>(null);

  // State for copy buttons
  copied = signal<string | null>(null);

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
  
  isAnythingLoading = computed(() => this.loadingList() || this.loadingAnalysis() || this.loadingLaborCosts() || this.loadingSummary());

  async generateList(): Promise<void> {
    if (!this.userInput().trim()) {
      this.errorList.set('Molimo unesite opis projekta.');
      return;
    }
    if (!this.analysis() || this.laborCosts().length === 0) {
      this.errorList.set('Potrebno je prvo generirati analizu projekta i troškove radova.');
      return;
    }

    this.loadingList.set(true);
    this.materialsList.set([]);
    this.summary.set(null); // Invalidate summary
    this.errorList.set(null);

    try {
      const result = await this.geminiService.generateBillOfMaterials(this.userInput(), this.analysis()!, this.laborCosts());
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
    this.laborCosts.set([]);      // Invalidate subsequent steps
    this.materialsList.set([]);   // Invalidate subsequent steps
    this.summary.set(null);       // Invalidate subsequent steps
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
    if (!this.analysis()) {
      this.errorLaborCosts.set('Potrebno je prvo generirati analizu projekta.');
      return;
    }

    this.loadingLaborCosts.set(true);
    this.laborCosts.set([]);
    this.materialsList.set([]); // Invalidate subsequent steps
    this.summary.set(null);     // Invalidate subsequent steps
    this.errorLaborCosts.set(null);

    try {
      const result = await this.geminiService.generateLaborCosts(this.userInput(), this.analysis()!);
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

  async generateSummary(): Promise<void> {
    if (!this.analysis() || this.materialsList().length === 0 || this.laborCosts().length === 0) {
      this.errorSummary.set('Potrebno je prvo generirati analizu, popis materijala i troškove radova.');
      return;
    }

    this.loadingSummary.set(true);
    this.summary.set(null);
    this.errorSummary.set(null);

    try {
      const result = await this.geminiService.generateOperationalSummary(
        this.analysis()!,
        this.materialsList(),
        this.laborCosts(),
        this.grandTotal()
      );
      this.summary.set(result);
    } catch (e: unknown) {
      if (e instanceof Error) {
        this.errorSummary.set(e.message);
      } else {
        this.errorSummary.set('Došlo je do nepoznate greške.');
      }
    } finally {
      this.loadingSummary.set(false);
    }
  }

  copyToClipboard(text: string, type: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.copied.set(type);
      setTimeout(() => this.copied.set(null), 2000);
    }).catch(err => console.error('Failed to copy: ', err));
  }

  downloadAsTxt(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  formatMaterialsForTxt(): string {
    let content = `POPIS MATERIJALA I TROŠKOVA\n`;
    content += `=================================\n\n`;
    content += `UKUPNO MATERIJAL: ${this.totalCost().toFixed(2)} EUR\n\n`;

    this.getGroupedMaterials().forEach(group => {
      content += `KATEGORIJA: ${group[0]}\n`;
      content += `------------------------------------------------------------------------------------------\n`;
      content += `| Materijal                     | Količina | Jed. | Cijena/jed.      | Ukupno           |\n`;
      content += `------------------------------------------------------------------------------------------\n`;
      group[1].forEach(item => {
        const name = item.name.padEnd(29);
        const quantity = item.quantity.toFixed(2).padStart(8);
        const unit = item.unit.padEnd(4);
        const price = `${item.estimatedPricePerUnit.toFixed(2)} EUR`.padStart(16);
        const total = `${(item.quantity * item.estimatedPricePerUnit).toFixed(2)} EUR`.padStart(16);
        content += `| ${name} | ${quantity} | ${unit} | ${price} | ${total} |\n`;
      });
      content += `------------------------------------------------------------------------------------------\n\n`;
    });
    return content;
  }

  formatLaborCostsForTxt(): string {
    let content = `TROŠKOVI RADOVA\n`;
    content += `=================\n\n`;
    content += `UKUPNO RADOVI: ${this.totalLaborCost().toFixed(2)} EUR\n\n`;
    content += `----------------------------------------------------------------------------------------------------------------\n`;
    content += `| Stavka                        | Količina | Jedinica  | Cijena/jed.      | Ukupno           | Opis \n`;
    content += `----------------------------------------------------------------------------------------------------------------\n`;
    this.laborCosts().forEach(item => {
      const stavka = item.stavka.padEnd(29);
      const kolicina = item.kolicina.toFixed(2).padStart(8);
      const jedinica = item.jedinica.padEnd(9);
      const cijena = `${item.cijena_po_jedinici.toFixed(2)} EUR`.padStart(16);
      const ukupno = `${(item.kolicina * item.cijena_po_jedinici).toFixed(2)} EUR`.padStart(16);
      const opis = item.opis;
      content += `| ${stavka} | ${kolicina} | ${jedinica} | ${cijena} | ${ukupno} | ${opis}\n`;
    });
    content += `----------------------------------------------------------------------------------------------------------------\n`;
    return content;
  }
  
  downloadAll(): void {
    let fullReport = `IZVJEŠTAJ O PROJEKTU RENOVACIJE\n`;
    fullReport += `=====================================\n\n`;
    fullReport += `Datum generiranja: ${new Date().toLocaleDateString('hr-HR')}\n`;
    fullReport += `Opis projekta: ${this.userInput()}\n\n`;
    fullReport += `-------------------------------------\n\n`;

    if (this.analysis()) {
      fullReport += `DETALJNA ANALIZA PROJEKTA\n`;
      fullReport += `==========================\n\n`;
      fullReport += `${this.analysis()}\n\n`;
      fullReport += `-------------------------------------\n\n`;
    }
    if (this.laborCosts().length > 0) {
      fullReport += this.formatLaborCostsForTxt() + `\n\n`;
      fullReport += `-------------------------------------\n\n`;
    }
    if (this.materialsList().length > 0) {
      fullReport += this.formatMaterialsForTxt() + `\n\n`;
      fullReport += `-------------------------------------\n\n`;
    }

    fullReport += `SVEUKUPNA PROCJENA TROŠKOVA\n`;
    fullReport += `=============================\n`;
    fullReport += `Ukupno materijal: ${this.totalCost().toFixed(2)} EUR\n`;
    fullReport += `Ukupno radovi:    ${this.totalLaborCost().toFixed(2)} EUR\n`;
    fullReport += `SVEUKUPNO:        ${this.grandTotal().toFixed(2)} EUR\n\n`;

    if (this.summary()) {
        fullReport += `-------------------------------------\n\n`;
        fullReport += `OPERATIVNI SAŽETAK\n`;
        fullReport += `====================\n\n`;
        fullReport += `${this.summary()}\n\n`;
    }
    
    this.downloadAsTxt(fullReport, 'izvjestaj_renovacije.txt');
  }

  // Helper method for template binding
  onUserInput(event: Event) {
    const target = event.target as HTMLTextAreaElement;
    this.userInput.set(target.value);
    this.clearAllResults();
  }

  private clearAllResults(): void {
    this.materialsList.set([]);
    this.errorList.set(null);
    this.analysis.set(null);
    this.errorAnalysis.set(null);
    this.laborCosts.set([]);
    this.errorLaborCosts.set(null);
    this.summary.set(null);
    this.errorSummary.set(null);
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