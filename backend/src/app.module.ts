import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GeminiModule } from './gemini/gemini.module';
import { StripeModule } from './stripe/stripe.module';
import { User, UserSchema } from './schemas/user.schema';
import { ApiConnection, ApiConnectionSchema } from './schemas/api-connection.schema';
import { TestRun, TestRunSchema } from './schemas/test-run.schema';
import { Invoice, InvoiceSchema } from './schemas/invoice.schema';
import { Transaction, TransactionSchema } from './schemas/transaction.schema';
import { ReconciliationMatch, ReconciliationMatchSchema } from './schemas/reconciliation-match.schema';
import { ReconciliationReport, ReconciliationReportSchema } from './schemas/reconciliation-report.schema';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    GeminiModule,
    StripeModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: ApiConnection.name, schema: ApiConnectionSchema },
      { name: TestRun.name, schema: TestRunSchema },
      { name: Invoice.name, schema: InvoiceSchema },
      { name: Transaction.name, schema: TransactionSchema },
      { name: ReconciliationMatch.name, schema: ReconciliationMatchSchema },
      { name: ReconciliationReport.name, schema: ReconciliationReportSchema },
    ]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
