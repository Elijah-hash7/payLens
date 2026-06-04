import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { selectTestCard, TestCard } from './test-cards';

export interface SimulatePaymentParams {
  testApiKey: string;
  scenario: string;
  amount?: number;   // in cents, default 1000 ($10.00)
  currency?: string; // default 'usd'
}

export interface PaymentSimulationResult {
  selectedCard: TestCard;
  chargeId: string;
  status: string;
  amount: number;
  currency: string;
  outcome: Record<string, unknown> | null;
  errorCode?: string;
  errorMessage?: string;
  raw: Record<string, unknown> | null;
}

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);

  async simulatePayment(params: SimulatePaymentParams): Promise<PaymentSimulationResult> {
    const { testApiKey, scenario, amount = 1000, currency = 'usd' } = params;

    if (!testApiKey.startsWith('sk_test_')) {
      throw new BadRequestException('Only Stripe test keys (sk_test_...) are allowed');
    }

    const stripe = new Stripe(testApiKey);
    const selectedCard = selectTestCard(scenario);

    this.logger.log(`Scenario: "${scenario}" → token: ${selectedCard.token}`);

    try {
      // Use Stripe test tokens — no raw card data needed
      const charge = await stripe.charges.create({
        amount,
        currency,
        source: selectedCard.token,
        description: scenario,
      });

      return {
        selectedCard,
        chargeId: charge.id,
        status: charge.status,
        amount: charge.amount,
        currency: charge.currency,
        outcome: charge.outcome as unknown as Record<string, unknown>,
        raw: charge as unknown as Record<string, unknown>,
      };
    } catch (err) {
      // Stripe throws for card declines — catch and return structured result
      if (err instanceof Stripe.errors.StripeCardError) {
        const raw = err.raw as Record<string, unknown>;
        const failedCharge = raw?.charge as Record<string, unknown> | undefined;

        return {
          selectedCard,
          chargeId: (failedCharge?.id as string) ?? 'unknown',
          status: 'failed',
          amount,
          currency,
          outcome: null,
          errorCode: err.code,
          errorMessage: err.message,
          raw: failedCharge ?? null,
        };
      }
      throw err;
    }
  }
}
