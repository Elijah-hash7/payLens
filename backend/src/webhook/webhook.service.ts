import { Injectable, Logger } from '@nestjs/common';

export interface WebhookResult {
  fired: boolean;
  statusCode: number | null;
  body: Record<string, unknown> | string | null;
  durationMs: number;
  error: string | null;
}

export interface FireWebhookParams {
  endpointUrl: string;
  payload: Record<string, unknown>;
  timeoutMs?: number;
}

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  async fire(params: FireWebhookParams): Promise<WebhookResult> {
    const { endpointUrl, payload, timeoutMs = 10000 } = params;

    this.logger.log(`Firing webhook to: ${endpointUrl}`);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const start = Date.now();

    try {
      const res = await fetch(endpointUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const durationMs = Date.now() - start;
      const rawText = await res.text();

      let body: Record<string, unknown> | string;
      try {
        body = JSON.parse(rawText) as Record<string, unknown>;
      } catch {
        body = rawText;
      }

      return {
        fired: true,
        statusCode: res.status,
        body,
        durationMs,
        error: null,
      };
    } catch (err) {
      const durationMs = Date.now() - start;
      const isTimeout = err instanceof Error && err.name === 'AbortError';

      return {
        fired: false,
        statusCode: null,
        body: null,
        durationMs,
        error: isTimeout
          ? `Webhook timed out after ${timeoutMs}ms`
          : (err instanceof Error ? err.message : 'Unknown error'),
      };
    } finally {
      clearTimeout(timer);
    }
  }

  // Builds a Stripe-shaped webhook event from a charge result
  buildStripeEvent(
    type: 'charge.succeeded' | 'charge.failed',
    chargeData: Record<string, unknown>,
  ): Record<string, unknown> {
    return {
      id: `evt_${Date.now()}`,
      object: 'event',
      api_version: '2024-06-20',
      created: Math.floor(Date.now() / 1000),
      type,
      livemode: false,
      data: { object: chargeData },
    };
  }

  // Builds a Paystack-shaped webhook event from a charge result
  buildPaystackEvent(
    event: 'charge.success' | 'charge.failed',
    chargeData: Record<string, unknown>,
  ): Record<string, unknown> {
    return {
      event,
      data: chargeData,
    };
  }
}
