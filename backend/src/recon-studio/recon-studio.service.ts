import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { parse } from 'csv-parse/sync';
import { Invoice, InvoiceDocument } from '../schemas/invoice.schema';
import { Transaction, TransactionDocument } from '../schemas/transaction.schema';
import { ReconciliationMatch, ReconciliationMatchDocument } from '../schemas/reconciliation-match.schema';
import { ReconciliationReport, ReconciliationReportDocument } from '../schemas/reconciliation-report.schema';
import { ElasticService } from '../elastic/elastic.service';
import { GeminiService } from '../gemini/gemini.service';
import { ArizeService } from '../monitoring/arize.service';

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
  private readonly logger = new Logger(ReconStudioService.name);

  constructor(
    @InjectModel(Invoice.name) private readonly invoiceModel: Model<InvoiceDocument>,
    @InjectModel(Transaction.name) private readonly transactionModel: Model<TransactionDocument>,
    @InjectModel(ReconciliationMatch.name) private readonly matchModel: Model<ReconciliationMatchDocument>,
    @InjectModel(ReconciliationReport.name) private readonly reportModel: Model<ReconciliationReportDocument>,
    private readonly elasticService: ElasticService,
    private readonly geminiService: GeminiService,
    private readonly arizeService: ArizeService,
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
    if (!Types.ObjectId.isValid(userId)) return [];
    return this.invoiceModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .lean();
  }

  async syncTransactions(userId: string): Promise<{ synced: number; skipped: number }> {
    if (!Types.ObjectId.isValid(userId)) throw new BadRequestException('Invalid user session — please log in');
    const invoices = await this.invoiceModel.find({ userId: new Types.ObjectId(userId) }).lean();
    if (invoices.length === 0) {
      throw new BadRequestException('Please upload invoices first to seed transaction simulation data');
    }

    let synced = 0;
    let skipped = 0;

    // We'll mock transaction ingestion from payment providers for each invoice
    for (let i = 0; i < invoices.length; i++) {
      const invoice = invoices[i];
      let amount = invoice.amount;
      let customerName = invoice.customerName;
      let provider = 'stripe';
      let metadata: Record<string, any> = { customerEmail: `${invoice.customerName.toLowerCase().replace(/[^a-z0-9]/g, '')}@example.com` };

      // We'll create different kinds of matching scenarios:
      // Scenario A: Exact Match (Stripe)
      if (i % 4 === 0) {
        provider = 'stripe';
      }
      // Scenario B: Fee-Deduction Match (Paystack, 1.5% fee subtracted from transaction)
      else if (i % 4 === 1) {
        provider = 'paystack';
        amount = Number((invoice.amount * 0.985).toFixed(2)); // 1.5% fee deducted
        metadata.originalAmountBeforeFees = invoice.amount;
      }
      // Scenario C: Name Typos (Bank Transfer, e.g. "Acme Corp" -> "ACM CORP LLC")
      else if (i % 4 === 2) {
        provider = 'bank';
        customerName = invoice.customerName
          .replace(/corp/i, 'CORP LLC')
          .replace(/inc/i, 'LLC')
          .toUpperCase();
      }
      // Scenario D: Standard Match
      else {
        provider = 'stripe';
        amount = invoice.amount;
      }

      const providerTxId = `tx_${provider}_${invoice.invoiceNumber}`;

      try {
        const tx = await this.transactionModel.create({
          userId: new Types.ObjectId(userId),
          provider,
          providerTransactionId: providerTxId,
          amount,
          currency: invoice.currency,
          paidAt: new Date(Date.now() - 3600000 * 24 * 2), // 2 days ago
          metadata: {
            ...metadata,
            customerName,
          },
        });

        // Index in Elasticsearch
        await this.elasticService.indexTransaction(userId, {
          transactionId: (tx._id as Types.ObjectId).toString(),
          provider,
          providerTransactionId: providerTxId,
          amount,
          currency: invoice.currency,
          paidAt: tx.paidAt.toISOString(),
          customerName,
          customerEmail: metadata.customerEmail,
          description: `Invoice match trigger ${invoice.invoiceNumber}`,
        });

        synced++;
      } catch (err: any) {
        if (err.message?.includes('duplicate key') || err.message?.includes('E11000')) {
          skipped++;
        } else {
          this.logger.warn(`Failed to seed transaction: ${err.message}`);
        }
      }
    }

    // Also seed a couple of completely unmatched random transactions to test flags
    for (let j = 1; j <= 2; j++) {
      const providerTxId = `tx_stripe_unmatched_00${j}`;
      const amount = 45.00 * j;
      const customerName = j === 1 ? 'John Smith' : 'Alpha Consulting';
      try {
        const tx = await this.transactionModel.create({
          userId: new Types.ObjectId(userId),
          provider: 'stripe',
          providerTransactionId: providerTxId,
          amount,
          currency: 'USD',
          paidAt: new Date(Date.now() - 3600000 * 24 * 5),
          metadata: {
            customerName,
            customerEmail: 'unmatched@example.com',
          },
        });

        await this.elasticService.indexTransaction(userId, {
          transactionId: (tx._id as Types.ObjectId).toString(),
          provider: 'stripe',
          providerTransactionId: providerTxId,
          amount,
          currency: 'USD',
          paidAt: tx.paidAt.toISOString(),
          customerName,
          customerEmail: 'unmatched@example.com',
          description: 'Random unmatched payment feed entry',
        });
        synced++;
      } catch {
        skipped++;
      }
    }

    return { synced, skipped };
  }

  async runReconciliation(userId: string): Promise<{ matchesGenerated: number }> {
    const userObjectId = new Types.ObjectId(userId);

    // Reset all invoices so recon can re-run from scratch
    await this.invoiceModel.updateMany({ userId: userObjectId }, { status: 'unpaid' });

    // Clear all previous match records
    await this.matchModel.deleteMany({ userId: userObjectId });

    // Re-index all transactions — approveMatch deletes them from ES, so restore here
    const allTransactions = await this.transactionModel.find({ userId: userObjectId }).lean();
    for (const tx of allTransactions) {
      await this.elasticService.indexTransaction(userId, {
        transactionId: (tx._id as Types.ObjectId).toString(),
        provider: tx.provider,
        providerTransactionId: tx.providerTransactionId,
        amount: tx.amount,
        currency: tx.currency,
        paidAt: (tx.paidAt as Date).toISOString(),
        customerName: (tx.metadata?.customerName as string) ?? undefined,
        customerEmail: (tx.metadata?.customerEmail as string) ?? undefined,
        description: (tx.metadata?.description as string) ?? undefined,
      });
    }

    // Fetch unpaid invoices (all were just reset to unpaid)
    const invoices = await this.invoiceModel.find({ userId: userObjectId, status: 'unpaid' });
    let matchesGenerated = 0;

    for (const invoice of invoices) {
      // Search Elastic search for candidates
      const candidates = await this.elasticService.searchTransactionCandidates(userId, {
        customerName: invoice.customerName,
        amount: invoice.amount,
        currency: invoice.currency,
      });

      for (const candidate of candidates) {
        const candidateObjectId = new Types.ObjectId(candidate.transactionId);

        // Verify that this transaction hasn't already been approved in another match
        const alreadyMatched = await this.matchModel.findOne({
          transactionId: candidateObjectId,
          status: 'approved',
        });
        if (alreadyMatched) continue;

        // Perform Matching Classification
        const isExactName = candidate.customerName?.toLowerCase() === invoice.customerName.toLowerCase();
        const isExactAmount = candidate.amount === invoice.amount;

        if (isExactName && isExactAmount) {
          // 1. High Confidence Elastic Auto-Match
          await this.matchModel.create({
            userId: userObjectId,
            invoiceId: invoice._id,
            transactionId: candidateObjectId,
            matchType: 'elastic',
            confidence: 1.0,
            status: 'pending_review',
          });

          // Log trace evaluation to Arize
          await this.arizeService.logSpan({
            agentName: 'ReconStudioAgent',
            taskName: 'elastic_exact_match',
            model: 'Elasticsearch Search Engine',
            latencyMs: 5,
            evaluation: 'PASS',
            metadata: {
              invoiceNumber: invoice.invoiceNumber,
              customerName: invoice.customerName,
              amount: invoice.amount,
            },
          });

          matchesGenerated++;
          break; // Match found for this invoice, move to next
        } else {
          // 2. Fuzzy / Fee-deducted match — Invoke Gemini for reasoning
          try {
            const startMs = Date.now();
            const suggestion = await this.geminiService.suggestMatch({
              invoice: {
                invoiceNumber: invoice.invoiceNumber,
                customerName: invoice.customerName,
                amount: invoice.amount,
                currency: invoice.currency,
                dueDate: invoice.dueDate?.toISOString(),
              },
              transaction: {
                provider: candidate.provider,
                providerTransactionId: candidate.providerTransactionId,
                amount: candidate.amount,
                currency: candidate.currency,
                paidAt: candidate.paidAt,
                metadata: {
                  customerName: candidate.customerName,
                  customerEmail: candidate.customerEmail,
                  description: candidate.description,
                },
              },
            });

            // Log trace monitoring evaluation to Arize
            await this.arizeService.logSpan({
              agentName: 'ReconStudioAgent',
              taskName: 'gemini_fuzzy_match_suggestion',
              model: this.geminiService['model'],
              latencyMs: Date.now() - startMs,
              evaluation: suggestion.isMatch ? 'PASS' : 'FAIL',
              metadata: {
                invoiceNumber: invoice.invoiceNumber,
                customerName: invoice.customerName,
                transactionAmount: candidate.amount,
                confidence: suggestion.confidence,
              },
            });

            if (suggestion.isMatch) {
              await this.matchModel.create({
                userId: userObjectId,
                invoiceId: invoice._id,
                transactionId: candidateObjectId,
                matchType: 'gemini',
                confidence: suggestion.confidence,
                geminiReasoning: suggestion.reasoning,
                status: 'pending_review',
              });
              matchesGenerated++;
              break; // Candidate matched, skip further searches for this invoice
            }
          } catch (err: any) {
            this.logger.warn(`Gemini matching suggestion failed: ${err.message}`);
          }
        }
      }
    }

    // Fetch all active matches confidence to evaluate accuracy drift in Arize
    const allMatches = await this.matchModel.find({ userId: userObjectId }).lean();
    this.arizeService.evaluateAccuracyDrift(
      allMatches.map((m) => ({ confidence: m.confidence ?? 1.0 }))
    );

    return { matchesGenerated };
  }

  async getMatches(userId: string): Promise<ReconciliationMatch[]> {
    if (!Types.ObjectId.isValid(userId)) return [];
    return this.matchModel
      .find({ userId: new Types.ObjectId(userId) })
      .populate('invoiceId')
      .populate('transactionId')
      .sort({ createdAt: -1 })
      .lean();
  }

  async approveMatch(userId: string, matchId: string): Promise<ReconciliationMatch> {
    const match = await this.matchModel.findOne({
      _id: new Types.ObjectId(matchId),
      userId: new Types.ObjectId(userId),
    });

    if (!match) throw new BadRequestException('Match record not found');
    if (match.status === 'approved') return match;

    match.status = 'approved';
    await match.save();

    // Mark corresponding invoice as paid
    await this.invoiceModel.findByIdAndUpdate(match.invoiceId, { status: 'paid' });

    // Clean up Elastic search index for this transaction so it's not suggested again
    await this.elasticService.deleteTransactionIndex(match.transactionId.toString());

    return match;
  }

  async rejectMatch(userId: string, matchId: string): Promise<ReconciliationMatch> {
    const match = await this.matchModel.findOne({
      _id: new Types.ObjectId(matchId),
      userId: new Types.ObjectId(userId),
    });

    if (!match) throw new BadRequestException('Match record not found');

    match.status = 'rejected';
    await match.save();

    return match;
  }

  async getReport(userId: string): Promise<ReconciliationReport | null> {
    const userObjectId = new Types.ObjectId(userId);
    const invoices = await this.invoiceModel.find({ userId: userObjectId }).lean();
    
    if (invoices.length === 0) return null;

    const totalInvoices = invoices.length;
    const totalMatched = invoices.filter((i) => i.status === 'paid').length;
    const totalUnmatched = totalInvoices - totalMatched;
    const totalOutstanding = totalUnmatched;

    const matchedMatches = await this.matchModel
      .find({ userId: userObjectId, status: 'approved' })
      .populate('transactionId')
      .lean();

    const matchedAmount = matchedMatches.reduce((sum, m: any) => sum + (m.transactionId?.amount ?? 0), 0);
    const outstandingAmount = invoices
      .filter((i) => i.status === 'unpaid')
      .reduce((sum, i) => sum + i.amount, 0);

    // Save report snapshot
    const report = await this.reportModel.create({
      userId: userObjectId,
      totalInvoices,
      totalMatched,
      totalUnmatched,
      totalOutstanding,
      matchedAmount,
      outstandingAmount,
      currency: invoices[0]?.currency ?? 'USD',
      matchIds: matchedMatches.map((m) => m._id as Types.ObjectId),
    });

    return report;
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
