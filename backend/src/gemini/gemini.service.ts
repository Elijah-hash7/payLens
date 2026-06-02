import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';

export interface ExplainTestRunParams {
  scenario: string;
  provider: 'stripe' | 'paystack';
  testCard?: string;
  paymentResult?: Record<string, unknown>;
  webhookStatusCode?: number;
  webhookBody?: Record<string, unknown>;
  webhookError?: string;
}

export interface SuggestMatchParams {
  invoice: {
    invoiceNumber: string;
    customerName: string;
    amount: number;
    currency: string;
    dueDate?: string;
  };
  transaction: {
    provider: string;
    providerTransactionId: string;
    amount: number;
    currency: string;
    paidAt: string;
    metadata?: Record<string, unknown>;
  };
}

export interface MatchSuggestion {
  isMatch: boolean;
  confidence: number;
  reasoning: string;
}

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly ai: GoogleGenAI;
  private readonly model: string;

  constructor(private readonly config: ConfigService) {
    this.ai = new GoogleGenAI({
      apiKey: config.getOrThrow<string>('GEMINI_API_KEY'),
    });
    this.model = config.get<string>('GEMINI_MODEL') ?? 'gemini-2.0-flash';
  }

  async prompt(text: string): Promise<string> {
    this.logger.debug('Sending prompt to Gemini');
    const response = await this.ai.models.generateContent({
      model: this.model,
      contents: text,
    });
    return response.text ?? '';
  }

  async explainTestRun(params: ExplainTestRunParams): Promise<string> {
    const text = `
You are a payment integration assistant inside PayLens Dev Studio.
A developer just ran a sandbox test. Explain what happened in clear, plain English — no jargon.
Cover: what the test tried to do, whether it succeeded, what the webhook returned, and why.
If there was an error, explain the likely cause and what the developer should fix.
Keep your response under 200 words.

--- TEST DETAILS ---
Provider: ${params.provider}
Developer scenario: "${params.scenario}"
Test card used: ${params.testCard ?? 'N/A'}
Payment result: ${JSON.stringify(params.paymentResult ?? {}, null, 2)}
Webhook status: ${params.webhookStatusCode ?? 'not fired'}
Webhook body: ${JSON.stringify(params.webhookBody ?? {}, null, 2)}
${params.webhookError ? `Webhook error: ${params.webhookError}` : ''}
`.trim();

    return this.prompt(text);
  }

  async suggestMatch(params: SuggestMatchParams): Promise<MatchSuggestion> {
    const text = `
You are a financial reconciliation assistant inside PayLens Recon Studio.
Decide whether the invoice and the transaction below refer to the same payment.

Return ONLY a valid JSON object with this shape:
{
  "isMatch": boolean,
  "confidence": number between 0 and 1,
  "reasoning": "one or two sentences explaining your decision"
}

--- INVOICE ---
${JSON.stringify(params.invoice, null, 2)}

--- TRANSACTION ---
${JSON.stringify(params.transaction, null, 2)}
`.trim();

    const raw = await this.prompt(text);
    const cleaned = raw.replace(/```(?:json)?\n?/g, '').trim();
    return JSON.parse(cleaned) as MatchSuggestion;
  }
}
