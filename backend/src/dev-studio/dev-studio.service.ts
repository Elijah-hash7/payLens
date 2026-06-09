import { Injectable } from '@nestjs/common';
import { StripeService } from '../stripe/stripe.service';
import { WebhookService, WebhookResult } from '../webhook/webhook.service';
import type { PaymentSimulationResult } from '../stripe/stripe.service';

export interface RunTestParams {
  testApiKey: string;
  scenario: string;
  webhookEndpointUrl: string;
  amount?: number;
  currency?: string;
}

export interface TestRunResult {
  payment: PaymentSimulationResult;
  webhook: WebhookResult;
}

@Injectable()
export class DevStudioService {
  constructor(
    private readonly stripeService: StripeService,
    private readonly webhookService: WebhookService,
  ) {}

  async runTest(params: RunTestParams): Promise<TestRunResult> {
    const { testApiKey, scenario, webhookEndpointUrl, amount, currency } = params;

    // Step 1: simulate the payment
    const payment = await this.stripeService.simulatePayment({
      testApiKey,
      scenario,
      amount,
      currency,
    });

    // Step 2: build a Stripe-shaped webhook event from the result
    const eventType = payment.status === 'succeeded' ? 'charge.succeeded' : 'charge.failed';
    const webhookPayload = this.webhookService.buildStripeEvent(
      eventType,
      (payment.raw ?? {}) as Record<string, unknown>,
    );

    // Step 3: fire the webhook to the developer's endpoint and capture the response
    const webhook = await this.webhookService.fire({
      endpointUrl: webhookEndpointUrl,
      payload: webhookPayload,
    });

    return { payment, webhook };
  }
}
