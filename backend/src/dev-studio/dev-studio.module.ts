import { Module } from '@nestjs/common';
import { DevStudioService } from './dev-studio.service';
import { DevStudioController } from './dev-studio.controller';
import { StripeModule } from '../stripe/stripe.module';
import { PaystackModule } from '../paystack/paystack.module';
import { WebhookModule } from '../webhook/webhook.module';
import { ElasticModule } from '../elastic/elastic.module';
import { GeminiModule } from '../gemini/gemini.module';

@Module({
  imports: [StripeModule, PaystackModule, WebhookModule, ElasticModule, GeminiModule],
  controllers: [DevStudioController],
  providers: [DevStudioService],
})
export class DevStudioModule {}
