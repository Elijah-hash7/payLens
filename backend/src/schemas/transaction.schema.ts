import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type TransactionDocument = HydratedDocument<Transaction>;

// Recon Studio: a payment event pulled from Stripe / Paystack via Fivetran
@Schema({ timestamps: true })
export class Transaction {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, enum: ['stripe', 'paystack', 'bank'] })
  provider: string;

  // ID assigned by the payment provider (idempotency key)
  @Prop({ required: true })
  providerTransactionId: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true, default: 'USD' })
  currency: string;

  @Prop({ required: true })
  paidAt: Date;

  // Provider-specific fields (customer email, description, etc.)
  @Prop({ type: Object })
  metadata?: Record<string, unknown>;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);
TransactionSchema.index({ userId: 1, providerTransactionId: 1, provider: 1 }, { unique: true });
