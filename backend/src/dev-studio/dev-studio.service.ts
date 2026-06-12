import { Injectable, Logger } from '@nestjs/common';
import { StripeService } from '../stripe/stripe.service';
import { PaystackService } from '../paystack/paystack.service';
import { WebhookService, WebhookResult } from '../webhook/webhook.service';
import { ElasticService } from '../elastic/elastic.service';
import { GeminiService } from '../gemini/gemini.service';
import { ArizeService } from '../monitoring/arize.service';
import type { PaymentSimulationResult } from '../stripe/stripe.service';

export interface RunTestParams {
  provider: 'stripe' | 'paystack';
  testApiKey: string;
  scenario: string;
  webhookEndpointUrl: string;
  userId?: string;
  amount?: number;
  currency?: string;
}

export interface TestRunResult {
  payment: any; // Can be Stripe or Paystack result
  webhook: WebhookResult;
  explanation: string;
}

@Injectable()
export class DevStudioService {
  private readonly logger = new Logger(DevStudioService.name);

  constructor(
    private readonly stripeService: StripeService,
    private readonly paystackService: PaystackService,
    private readonly webhookService: WebhookService,
    private readonly elasticService: ElasticService,
    private readonly geminiService: GeminiService,
    private readonly arizeService: ArizeService,
  ) {}

  async runTest(params: RunTestParams): Promise<TestRunResult> {
    const { provider, testApiKey, scenario, webhookEndpointUrl, userId, amount, currency } = params;

    let payment: any;
    let eventType: 'charge.succeeded' | 'charge.failed' | 'charge.success';
    let webhookPayload: Record<string, any>;

    if (provider === 'paystack') {
      payment = await this.paystackService.simulatePayment({
        testApiKey,
        scenario,
        amount,
        currency: currency || 'NGN',
      });
      // Paystack success event is charge.success, failure is charge.failed
      eventType = payment.status === 'succeeded' ? 'charge.success' : 'charge.failed';
      webhookPayload = this.webhookService.buildPaystackEvent(
        eventType,
        (payment.raw ?? {}) as Record<string, unknown>,
      );
    } else {
      payment = await this.stripeService.simulatePayment({
        testApiKey,
        scenario,
        amount,
        currency: currency || 'usd',
      });
      eventType = payment.status === 'succeeded' ? 'charge.succeeded' : 'charge.failed';
      webhookPayload = this.webhookService.buildStripeEvent(
        eventType,
        (payment.raw ?? {}) as Record<string, unknown>,
      );
    }

    const webhook = await this.webhookService.fire({
      endpointUrl: webhookEndpointUrl,
      payload: webhookPayload,
    });

    // Gemini explains the result in plain English
    let explanation: string;
    try {
      explanation = await this.geminiService.explainTestRun({
        scenario,
        provider: provider || 'stripe',
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
    } catch (err: any) {
      this.logger.warn(`Gemini explanation unavailable: ${err.message}`);
      explanation = `Payment ${payment.status === 'succeeded' ? 'succeeded' : 'failed'}. Webhook ${webhook.fired ? `delivered (HTTP ${webhook.statusCode})` : 'could not be delivered'}. Gemini analysis is temporarily unavailable — please try again shortly.`;
    }

    // Save to Elastic — non-blocking, errors are swallowed inside indexTestRun
    await this.elasticService.indexTestRun({
      userId: userId ?? 'anonymous',
      scenario,
      provider: provider || 'stripe',
      selectedCard: payment.selectedCard.token,
      paymentStatus: payment.status,
      chargeId: payment.chargeId ?? '',
      webhookFired: webhook.fired,
      webhookStatusCode: webhook.statusCode ?? null,
      webhookDurationMs: webhook.durationMs,
      webhookError: webhook.error ?? null,
      errorCode: payment.errorCode ?? (payment.outcome?.reason as string | undefined) ?? (payment.outcome?.gatewayResponse as string | undefined),
      errorMessage: payment.errorMessage ?? (payment.outcome?.sellerMessage as string | undefined) ?? (payment.outcome?.gatewayResponse as string | undefined),
      createdAt: new Date().toISOString(),
    });

    // Log trace monitoring evaluation to Arize
    const startMs = Date.now();
    const promptLen = scenario.length;
    const responseLen = explanation.length;
    await this.arizeService.logSpan({
      agentName: 'DevStudioAgent',
      taskName: `simulate_${provider}_charge`,
      model: this.geminiService['model'],
      latencyMs: Date.now() - startMs + (webhook.durationMs || 100),
      inputTokens: Math.ceil(promptLen / 4),
      outputTokens: Math.ceil(responseLen / 4),
      evaluation: payment.status === 'succeeded' ? 'PASS' : 'FLAGGED',
      metadata: {
        provider,
        currency: payment.currency,
        amount: payment.amount,
        webhookStatusCode: webhook.statusCode,
      },
    });

    return { payment, webhook, explanation };
  }
}
