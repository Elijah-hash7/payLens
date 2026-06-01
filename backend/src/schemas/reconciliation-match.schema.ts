import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ReconciliationMatchDocument = HydratedDocument<ReconciliationMatch>;

// Recon Studio: one matched (or flagged) invoice ↔ transaction pair
@Schema({ timestamps: true })
export class ReconciliationMatch {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Invoice', required: true })
  invoiceId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Transaction', required: true })
  transactionId: Types.ObjectId;

  // How the match was made
  @Prop({ required: true, enum: ['elastic', 'gemini', 'manual'] })
  matchType: string;

  // 0–1 confidence from Elastic or Gemini
  @Prop({ min: 0, max: 1 })
  confidence?: number;

  // Gemini's written reasoning for the suggested match
  @Prop()
  geminiReasoning?: string;

  @Prop({
    required: true,
    enum: ['pending_review', 'approved', 'rejected'],
    default: 'pending_review',
  })
  status: string;
}

export const ReconciliationMatchSchema =
  SchemaFactory.createForClass(ReconciliationMatch);
