import { Module } from '@nestjs/common';
import { DevStudioService } from './dev-studio.service';
import { DevStudioController } from './dev-studio.controller';
import { StripeModule } from '../stripe/stripe.module';
import { WebhookModule } from '../webhook/webhook.module';
import { ElasticModule } from '../elastic/elastic.module';

@Module({
  imports: [StripeModule, WebhookModule, ElasticModule],
  controllers: [DevStudioController],
  providers: [DevStudioService],
})
export class DevStudioModule {}
