import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { parse } from 'csv-parse/sync';
import { Invoice, InvoiceDocument } from '../schemas/invoice.schema';
import { Transaction, TransactionDocument } from '../schemas/transaction.schema';
import { ReconciliationMatch, ReconciliationMatchDocument } from '../schemas/reconciliation-match.schema';
import { ElasticService } from '../elastic/elastic.service';
import { GeminiService } from '../gemini/gemini.service';

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

export interface ReconcileResult {
  matched: number;
  unmatched: number;
  matches: {
    invoiceNumber: string;
    customerName: string;
    amount: number;
    matchedTransaction?: string;
    confidence?: number;
    geminiReasoning?: string;
    status: string;
  }[];
}

@Injectable()
export class ReconStudioService {
  constructor(
    @InjectModel(Invoice.name) private readonly invoiceModel: Model<InvoiceDocument>,
    @InjectModel(Transaction.name) private readonly transactionModel: Model<TransactionDocument>,
    @InjectModel(ReconciliationMatch.name) private readonly matchModel: Model<ReconciliationMatchDocument>,
    private readonly elasticService: ElasticService,
    private readonly geminiService: GeminiService,
  ) {}

  async uploadInvoicesCsv(userId: string, fileBuffer: Buffer): Promise<UploadResult> {
    let rows: Record<string, string>[];

    try {
      rows = parse(fileBuffer, {
        columns: true,
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

  async seedTransaction(userId: string, body: {
    provider: string;
    providerTransactionId: string;
    amount: number;
    currency: string;
    paidAt: string;
    customerName?: string;
    description?: string;
  }): Promise<{ mongoId: string; elasticId: string }> {
    const doc = await this.transactionModel.create({
      userId: new Types.ObjectId(userId),
      provider: body.provider,
      providerTransactionId: body.providerTransactionId,
      amount: body.amount,
      currency: body.currency,
      paidAt: new Date(body.paidAt),
      metadata: { customerName: body.customerName, description: body.description },
    });

    const elasticId = await this.elasticService.indexTransaction({
      userId,
      provider: body.provider,
      providerTransactionId: body.providerTransactionId,
      amount: body.amount,
      currency: body.currency.toUpperCase(),
      paidAt: body.paidAt,
      customerName: body.customerName,
      description: body.description,
    });

    return { mongoId: (doc._id as Types.ObjectId).toString(), elasticId };
  }

  async reconcile(userId: string): Promise<ReconcileResult> {
    const invoices = await this.invoiceModel
      .find({ userId: new Types.ObjectId(userId), status: 'unpaid' })
      .lean();

    const result: ReconcileResult = { matched: 0, unmatched: 0, matches: [] };

    for (const invoice of invoices) {
      const candidates = await this.elasticService.fuzzyMatchForInvoice(userId, {
        customerName: invoice.customerName,
        amount: invoice.amount,
        currency: invoice.currency,
      });

      if (candidates.length === 0) {
        result.unmatched++;
        result.matches.push({
          invoiceNumber: invoice.invoiceNumber,
          customerName: invoice.customerName,
          amount: invoice.amount,
          status: 'unmatched',
        });
        continue;
      }

      const top = candidates[0];

      // Gemini validates the top candidate
      const suggestion = await this.geminiService.suggestMatch({
        invoice: {
          invoiceNumber: invoice.invoiceNumber,
          customerName: invoice.customerName,
          amount: invoice.amount,
          currency: invoice.currency,
          dueDate: invoice.dueDate?.toISOString(),
        },
        transaction: {
          provider: top.transaction.provider,
          providerTransactionId: top.transaction.providerTransactionId,
          amount: top.transaction.amount,
          currency: top.transaction.currency,
          paidAt: top.transaction.paidAt,
          metadata: { customerName: top.transaction.customerName },
        },
      });

      if (suggestion.isMatch) {
        // Find the transaction MongoDB doc
        const txDoc = await this.transactionModel.findOne({
          userId: new Types.ObjectId(userId),
          providerTransactionId: top.transaction.providerTransactionId,
        });

        if (txDoc) {
          await this.matchModel.create({
            userId: new Types.ObjectId(userId),
            invoiceId: invoice._id,
            transactionId: txDoc._id,
            matchType: 'elastic',
            confidence: suggestion.confidence,
            geminiReasoning: suggestion.reasoning,
            status: 'pending_review',
          });

          await this.invoiceModel.updateOne(
            { _id: invoice._id },
            { status: 'matched' },
          );
        }

        result.matched++;
        result.matches.push({
          invoiceNumber: invoice.invoiceNumber,
          customerName: invoice.customerName,
          amount: invoice.amount,
          matchedTransaction: top.transaction.providerTransactionId,
          confidence: suggestion.confidence,
          geminiReasoning: suggestion.reasoning,
          status: 'matched',
        });
      } else {
        result.unmatched++;
        result.matches.push({
          invoiceNumber: invoice.invoiceNumber,
          customerName: invoice.customerName,
          amount: invoice.amount,
          status: 'unmatched',
        });
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
