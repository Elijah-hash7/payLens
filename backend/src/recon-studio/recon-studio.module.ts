import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReconStudioService } from './recon-studio.service';
import { ReconStudioController } from './recon-studio.controller';
import { Invoice, InvoiceSchema } from '../schemas/invoice.schema';
import { Transaction, TransactionSchema } from '../schemas/transaction.schema';
import { ReconciliationMatch, ReconciliationMatchSchema } from '../schemas/reconciliation-match.schema';
import { ElasticModule } from '../elastic/elastic.module';
import { GeminiModule } from '../gemini/gemini.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Invoice.name, schema: InvoiceSchema },
      { name: Transaction.name, schema: TransactionSchema },
      { name: ReconciliationMatch.name, schema: ReconciliationMatchSchema },
    ]),
    ElasticModule,
    GeminiModule,
  ],
  controllers: [ReconStudioController],
  providers: [ReconStudioService],
  exports: [ReconStudioService],
})
export class ReconStudioModule {}
