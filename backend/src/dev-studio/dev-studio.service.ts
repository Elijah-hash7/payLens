import { Injectable } from '@nestjs/common';
import { StripeService } from '../stripe/stripe.service';
import { WebhookService, WebhookResult } from '../webhook/webhook.service';
import { ElasticService } from '../elastic/elastic.service';
import { GeminiService } from '../gemini/gemini.service';
import type { PaymentSimulationResult } from '../stripe/stripe.service';

export interface RunTestParams {
  testApiKey: string;
  scenario: string;
  webhookEndpointUrl: string;
  userId?: string;
  amount?: number;
  currency?: string;
}

export interface TestRunResult {
  payment: PaymentSimulationResult;
  webhook: WebhookResult;
  explanation: string;
}

@Injectable()
export class DevStudioService {
  constructor(
    private readonly stripeService: StripeService,
    private readonly webhookService: WebhookService,
    private readonly elasticService: ElasticService,
    private readonly geminiService: GeminiService,
  ) {}

  async runTest(params: RunTestParams): Promise<TestRunResult> {
    const { testApiKey, scenario, webhookEndpointUrl, userId, amount, currency } = params;

    const payment = await this.stripeService.simulatePayment({
      testApiKey,
      scenario,
      amount,
      currency,
    });

    const eventType = payment.status === 'succeeded' ? 'charge.succeeded' : 'charge.failed';
    const webhookPayload = this.webhookService.buildStripeEvent(
      eventType,
      (payment.raw ?? {}) as Record<string, unknown>,
    );

    const webhook = await this.webhookService.fire({
      endpointUrl: webhookEndpointUrl,
      payload: webhookPayload,
    });

    // Gemini explains the result in plain English
    const explanation = await this.geminiService.explainTestRun({
      scenario,
      provider: 'stripe',
      testCard: payment.selectedCard.token,
      paymentResult: {
        status: payment.status,
        chargeId: payment.chargeId,
        amount: payment.amount,
        currency: payment.currency,
        errorCode: payment.errorCode,
        errorMessage: payment.errorMessage,
      },
      webhookStatusCode: webhook.statusCode ?? undefined,
      webhookBody: webhook.body ? (webhook.body as Record<string, unknown>) : undefined,
      webhookError: webhook.error ?? undefined,
    });

    // Save to Elastic — non-blocking, errors are swallowed inside indexTestRun
    await this.elasticService.indexTestRun({
      userId: userId ?? 'anonymous',
      scenario,
      provider: 'stripe',
      selectedCard: payment.selectedCard.token,
      paymentStatus: payment.status,
      chargeId: payment.chargeId ?? '',
      webhookFired: webhook.fired,
      webhookStatusCode: webhook.statusCode ?? null,
      webhookDurationMs: webhook.durationMs,
      webhookError: webhook.error ?? null,
      errorCode: payment.errorCode ?? (payment.outcome?.reason as string | undefined),
      errorMessage: payment.errorMessage ?? (payment.outcome?.sellerMessage as string | undefined),
      createdAt: new Date().toISOString(),
    });

    return { payment, webhook, explanation };
  }
}
