import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ReconciliationReportDocument =
  HydratedDocument<ReconciliationReport>;

// Recon Studio: summary snapshot generated after the user approves all matches
@Schema({ timestamps: true })
export class ReconciliationReport {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  totalInvoices: number;

  @Prop({ required: true })
  totalMatched: number;

  @Prop({ required: true })
  totalUnmatched: number;

  @Prop({ required: true })
  totalOutstanding: number;

  // Sum of all matched transaction amounts
  @Prop({ required: true })
  matchedAmount: number;

  // Sum of all unmatched invoice amounts still owed
  @Prop({ required: true })
  outstandingAmount: number;

  @Prop({ required: true, default: 'USD' })
  currency: string;

  // IDs of every ReconciliationMatch included in this report
  @Prop({ type: [Types.ObjectId], ref: 'ReconciliationMatch', default: [] })
  matchIds: Types.ObjectId[];
}

export const ReconciliationReportSchema =
  SchemaFactory.createForClass(ReconciliationReport);
