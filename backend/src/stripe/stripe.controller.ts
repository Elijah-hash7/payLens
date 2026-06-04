import { Controller, Post, Body } from '@nestjs/common';
import { StripeService } from './stripe.service';
import type { SimulatePaymentParams } from './stripe.service';

@Controller('stripe')
export class StripeController {
  constructor(private readonly stripeService: StripeService) {}

  @Post('simulate')
  simulate(@Body() body: SimulatePaymentParams) {
    return this.stripeService.simulatePayment(body);
  }
}
