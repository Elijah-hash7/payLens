import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { selectPaystackTestCard, PaystackTestCard } from './test-cards';

export interface SimulatePaystackPaymentParams {
  testApiKey: string;
  scenario: string;
  amount?: number;   // in kobo/cents, default 1000 (10.00)
  currency?: string; // default 'NGN'
}

export interface PaystackSimulationResult {
  selectedCard: {
    token: string;
    scenario: string;
    expectedOutcome: string;
  };
  chargeId: string;
  status: string; // 'succeeded' or 'failed'
  amount: number;
  currency: string;
  outcome: Record<string, unknown> | null;
  errorCode?: string;
  errorMessage?: string;
  raw: Record<string, unknown> | null;
}

@Injectable()
export class PaystackService {
  private readonly logger = new Logger(PaystackService.name);

  async simulatePayment(params: SimulatePaystackPaymentParams): Promise<PaystackSimulationResult> {
    const { testApiKey, scenario, amount = 1000, currency = 'NGN' } = params;

    if (!testApiKey.startsWith('sk_test_')) {
      throw new BadRequestException('Only Paystack test keys (sk_test_...) are allowed');
    }

    const selectedCard = selectPaystackTestCard(scenario);
    const maskedCard = `${selectedCard.number.substring(0, 4)} ${selectedCard.number.substring(4, 6)}XX XXXX ${selectedCard.number.substring(12)}`;

    this.logger.log(`Scenario: "${scenario}" → Paystack card: ${maskedCard}`);

    const payload = {
      email: 'customer@paylens.com',
      amount: amount,
      currency: currency.toUpperCase(),
      card: {
        number: selectedCard.number,
        cvv: selectedCard.cvv,
        expiry_month: selectedCard.expiryMonth,
        expiry_year: selectedCard.expiryYear,
      },
    };

    try {
      const res = await fetch('https://api.paystack.co/charge', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${testApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorText = await res.text();
        let errorBody;
        try {
          errorBody = JSON.parse(errorText);
        } catch {
          errorBody = { message: errorText };
        }
        throw new BadRequestException(errorBody.message || 'Paystack API request failed');
      }

      let resBody = await res.json();

      // If transaction requires PIN submission, handle it automatically
      if (resBody.data?.status === 'send_pin') {
        this.logger.log(`Paystack requested PIN for reference: ${resBody.data.reference}. Submitting pin...`);
        const pinRes = await fetch('https://api.paystack.co/charge/submit_pin', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${testApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            pin: selectedCard.pin,
            reference: resBody.data.reference,
          }),
        });

        if (pinRes.ok) {
          resBody = await pinRes.json();
        }
      }

      // If transaction requires OTP submission, handle it automatically (e.g. 123456)
      if (resBody.data?.status === 'send_otp') {
        this.logger.log(`Paystack requested OTP for reference: ${resBody.data.reference}. Submitting otp...`);
        const otpRes = await fetch('https://api.paystack.co/charge/submit_otp', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${testApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            otp: '123456',
            reference: resBody.data.reference,
          }),
        });

        if (otpRes.ok) {
          resBody = await otpRes.json();
        }
      }

      const data = resBody.data ?? {};
      const status = data.status === 'success' ? 'succeeded' : 'failed';

      return {
        selectedCard: {
          token: maskedCard,
          scenario: selectedCard.scenario,
          expectedOutcome: selectedCard.expectedOutcome,
        },
        chargeId: data.reference ?? data.id?.toString() ?? 'unknown',
        status,
        amount: data.amount ?? amount,
        currency: data.currency ?? currency,
        outcome: {
          gatewayResponse: data.gateway_response || resBody.message || null,
          status: data.status || null,
        },
        errorCode: status === 'failed' ? data.gateway_response || 'declined' : undefined,
        errorMessage: status === 'failed' ? data.gateway_response || 'Transaction failed' : undefined,
        raw: resBody,
      };
    } catch (err) {
      this.logger.error(`Paystack simulation failed: ${err.message}`);
      if (err instanceof BadRequestException) {
        throw err;
      }
      throw new BadRequestException(`Paystack request error: ${err.message}`);
    }
  }
}
