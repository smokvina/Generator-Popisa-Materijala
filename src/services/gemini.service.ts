import { Injectable } from '@angular/core';
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Materijal } from '../materijal.interface';
import { LaborCost } from '../labor-cost.interface';

@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    // IMPORTANT: The API key is sourced from environment variables.
    // Do not hardcode or expose the API key in the client-side code.
    // This setup assumes `process.env.API_KEY` is replaced by a build process
    // or is available in the execution environment.
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("API_KEY environment variable not set.");
    }
    this.ai = new GoogleGenAI({ apiKey });
  }

  async generateBillOfMaterials(description: string): Promise<Materijal[]> {
    const model = 'gemini-2.5-flash';
    const systemInstruction = `Ti si stručnjak za renoviranje i tvoja je uloga generirati strukturirani popis materijala i procijenjene troškove u JSON formatu na temelju zahtjeva korisnika. Koristi isključivo hrvatski jezik. Moraju biti uključeni materijali za podove, zidove, boju, rasvjetu i vodovodne instalacije. Količine i cijene moraju biti realistične za tipičan projekt renovacije na području Hrvatske i Europe. Cijene moraju biti u EUR.`;
    const userPrompt = `Generiraj detaljan popis materijala za renoviranje stana opisanog kao: ${description}. Budi precizan u procjeni količine i cijene.`;
    
    const schema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: {
            type: Type.STRING,
            description: 'Naziv materijala.',
          },
          category: {
            type: Type.STRING,
            description: 'Kategorija kojoj materijal pripada (npr. Podovi, Zidovi, Boja, Rasvjeta, Vodovod).',
          },
          quantity: {
            type: Type.NUMBER,
            description: 'Procijenjena potrebna količina materijala.',
          },
          unit: {
            type: Type.STRING,
            description: 'Mjerna jedinica za količinu (npr. m², kom, L, kg).',
          },
          estimatedPricePerUnit: {
            type: Type.NUMBER,
            description: 'Procijenjena cijena po mjernoj jedinici u EUR.',
          },
        },
        required: ['name', 'category', 'quantity', 'unit', 'estimatedPricePerUnit'],
      },
    };

    try {
      const response: GenerateContentResponse = await this.ai.models.generateContent({
        model,
        contents: userPrompt,
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: schema,
          temperature: 0.5,
        },
      });

      const jsonText = response.text.trim();
      // Handle potential markdown ```json ``` wrapper
      const sanitizedJsonText = jsonText.replace(/^```json\s*|```$/g, '');
      const parsedResponse: Materijal[] = JSON.parse(sanitizedJsonText);
      
      return parsedResponse;

    } catch (error) {
      console.error('Error generating bill of materials:', error);
      if (error instanceof Error && error.message.includes("API_KEY")) {
        throw new Error('Došlo je do problema s autorizacijom. Provjerite vaš API ključ.');
      }
      throw new Error('Nije moguće generirati popis materijala. Molimo pokušajte ponovo.');
    }
  }

  async generateProjectAnalysis(description: string): Promise<string> {
    const model = 'gemini-2.5-flash';
    const systemInstruction = `Ti si savjetnik i voditelj projekata renoviranja. Tvoja je zadaća pružiti sveobuhvatnu analizu projekta renovacije u jednoj, dobro strukturiranoj poruci koristeći Markdown format. Uvijek obuhvati sljedeće sekcije: Objašnjenje posla, Detaljna analiza, Potrebni dokumenti, Potrebni projekti, Ključni radovi i Nabava. Piši profesionalnim tonom i isključivo na hrvatskom jeziku.`;
    const userPrompt = `Pruži detaljnu analizu projekta renovacije: ${description}`;

    try {
      const response: GenerateContentResponse = await this.ai.models.generateContent({
        model,
        contents: userPrompt,
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: 'text/plain',
          temperature: 0.2,
        },
      });

      return response.text.trim();

    } catch (error) {
      console.error('Error generating project analysis:', error);
      if (error instanceof Error && error.message.includes("API_KEY")) {
        throw new Error('Došlo je do problema s autorizacijom. Provjerite vaš API ključ.');
      }
      throw new Error('Nije moguće generirati analizu projekta. Molimo pokušajte ponovo.');
    }
  }

  async generateLaborCosts(description: string): Promise<LaborCost[]> {
    const model = 'gemini-2.5-flash';
    const systemInstruction = `Ti si stručnjak za kalkulacije u građevinarstvu i tvoja je uloga generirati strukturirani popis troškova radova u JSON formatu na temelju zahtjeva korisnika. Koristi isključivo hrvatski jezik. Procijeni količine i cijene radova realistično za tipičan projekt renovacije na području Hrvatske i Europe. Cijene moraju biti u EUR. Uključi sve ključne faze radova, od rušenja do završnih radova.`;
    const userPrompt = `Generiraj detaljan popis troškova radova za renoviranje stana opisanog kao: ${description}. Budi precizan u procjeni količine i cijene.`;
    
    const schema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          stavka: {
            type: Type.STRING,
            description: 'Naziv stavke radova (npr. Rušenje pregradnog zida).',
          },
          opis: {
            type: Type.STRING,
            description: 'Kratak opis što stavka uključuje.',
          },
          kolicina: {
            type: Type.NUMBER,
            description: 'Procijenjena količina radova.',
          },
          jedinica: {
            type: Type.STRING,
            description: 'Mjerna jedinica (npr. m², m, kom, sat, paušal).',
          },
          cijena_po_jedinici: {
            type: Type.NUMBER,
            description: 'Procijenjena cijena po mjernoj jedinici u EUR.',
          },
        },
        required: ['stavka', 'opis', 'kolicina', 'jedinica', 'cijena_po_jedinici'],
      },
    };

    try {
      const response: GenerateContentResponse = await this.ai.models.generateContent({
        model,
        contents: userPrompt,
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: schema,
          temperature: 0.5,
        },
      });

      const jsonText = response.text.trim();
      const sanitizedJsonText = jsonText.replace(/^```json\s*|```$/g, '');
      const parsedResponse: LaborCost[] = JSON.parse(sanitizedJsonText);
      
      return parsedResponse;

    } catch (error) {
      console.error('Error generating labor costs:', error);
      if (error instanceof Error && error.message.includes("API_KEY")) {
        throw new Error('Došlo je do problema s autorizacijom. Provjerite vaš API ključ.');
      }
      throw new Error('Nije moguće generirati troškove radova. Molimo pokušajte ponovo.');
    }
  }
}
