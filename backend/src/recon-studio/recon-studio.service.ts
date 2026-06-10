import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { parse } from 'csv-parse/sync';
import { Invoice, InvoiceDocument } from '../schemas/invoice.schema';

export interface ParsedInvoiceRow {
  invoiceNumber: string;
  customerName: string;
  amount: number;
  currency: string;
  dueDate?: string;
}

export interface UploadResult {
  inserted: number;
  skipped: number;
  errors: string[];
}

@Injectable()
export class ReconStudioService {
  constructor(
    @InjectModel(Invoice.name) private readonly invoiceModel: Model<InvoiceDocument>,
  ) {}

  async uploadInvoicesCsv(userId: string, fileBuffer: Buffer): Promise<UploadResult> {
    let rows: Record<string, string>[];

    try {
      rows = parse(fileBuffer, {
        columns: true,         // first row is header
        skip_empty_lines: true,
        trim: true,
      }) as Record<string, string>[];
    } catch {
      throw new BadRequestException('Could not parse CSV — check the file format');
    }

    const result: UploadResult = { inserted: 0, skipped: 0, errors: [] };

    for (const row of rows) {
      const parsed = this.parseRow(row);
      if (!parsed) {
        result.errors.push(`Skipped row — missing required fields: ${JSON.stringify(row)}`);
        result.skipped++;
        continue;
      }

      try {
        await this.invoiceModel.create({
          userId: new Types.ObjectId(userId),
          invoiceNumber: parsed.invoiceNumber,
          customerName: parsed.customerName,
          amount: parsed.amount,
          currency: parsed.currency,
          dueDate: parsed.dueDate ? new Date(parsed.dueDate) : undefined,
          status: 'unpaid',
          rawData: row,
        });
        result.inserted++;
      } catch (err: unknown) {
        const msg = (err as Error).message ?? '';
        if (msg.includes('duplicate key') || msg.includes('E11000')) {
          result.skipped++;
        } else {
          result.errors.push(`Row ${parsed.invoiceNumber}: ${msg}`);
          result.skipped++;
        }
      }
    }

    return result;
  }

  async getInvoices(userId: string) {
    return this.invoiceModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .lean();
  }

  private parseRow(row: Record<string, string>): ParsedInvoiceRow | null {
    // Accept common column name variations
    const invoiceNumber =
      row['invoiceNumber'] ?? row['invoice_number'] ?? row['InvoiceNumber'] ?? row['Invoice Number'];
    const customerName =
      row['customerName'] ?? row['customer_name'] ?? row['CustomerName'] ?? row['Customer Name'];
    const amountRaw =
      row['amount'] ?? row['Amount'] ?? row['total'] ?? row['Total'];
    const currency =
      row['currency'] ?? row['Currency'] ?? 'USD';
    const dueDate =
      row['dueDate'] ?? row['due_date'] ?? row['DueDate'] ?? row['Due Date'];

    if (!invoiceNumber || !customerName || !amountRaw) return null;

    const amount = parseFloat(amountRaw.replace(/[^0-9.]/g, ''));
    if (isNaN(amount)) return null;

    return { invoiceNumber, customerName, amount, currency, dueDate };
  }
}
