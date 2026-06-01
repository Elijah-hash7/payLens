import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type InvoiceDocument = HydratedDocument<Invoice>;

// Recon Studio: one row from the uploaded CSV
@Schema({ timestamps: true })
export class Invoice {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  invoiceNumber: string;

  @Prop({ required: true })
  customerName: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true, default: 'USD' })
  currency: string;

  @Prop()
  dueDate?: Date;

  @Prop({ required: true, enum: ['unpaid', 'matched', 'partial', 'overpaid'], default: 'unpaid' })
  status: string;

  // Raw row from the CSV for reference
  @Prop({ type: Object })
  rawData?: Record<string, string>;
}

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);
InvoiceSchema.index({ userId: 1, invoiceNumber: 1 }, { unique: true });
