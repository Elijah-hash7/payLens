import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@elastic/elasticsearch';

const RUNS_INDEX = 'paylens-test-runs';
const TRANSACTIONS_INDEX = 'paylens-transactions';

export interface TestRunLog {
  userId: string;
  scenario: string;
  provider: string;
  selectedCard: string;
  paymentStatus: string;
  chargeId: string;
  webhookFired: boolean;
  webhookStatusCode: number | null;
  webhookDurationMs: number;
  webhookError: string | null;
  errorCode?: string;
  errorMessage?: string;
  createdAt: string;
}

export interface ElasticTransactionDoc {
  transactionId: string;
  provider: string;
  providerTransactionId: string;
  amount: number;
  currency: string;
  paidAt: string;
  customerName?: string;
  customerEmail?: string;
  description?: string;
}

export interface TransactionMatchCandidate {
  transactionId: string;
  provider: string;
  providerTransactionId: string;
  amount: number;
  currency: string;
  paidAt: string;
  customerName?: string;
  customerEmail?: string;
  description?: string;
  score: number;
}

@Injectable()
export class ElasticService implements OnModuleInit {
  private readonly logger = new Logger(ElasticService.name);
  private client: Client;
  private enabled = false;

  constructor(private readonly config: ConfigService) {
    const url = config.get<string>('ELASTIC_URL');
    if (!url) {
      this.logger.warn('ELASTIC_URL not set — Elasticsearch indexing disabled');
      return;
    }

    const apiKey = config.get<string>('ELASTIC_API_KEY');
    this.client = new Client({
      node: url,
      ...(apiKey ? { auth: { apiKey } } : {}),
    });
    this.enabled = true;
  }

  async onModuleInit() {
    if (!this.enabled) return;
    try {
      await this.ensureIndices();
      this.logger.log('Elasticsearch connected');
    } catch (err) {
      this.logger.warn(`Elasticsearch not reachable: ${(err as Error).message}`);
    }
  }

  async indexTestRun(log: TestRunLog): Promise<void> {
    if (!this.enabled) return;
    try {
      await this.client.index({ index: RUNS_INDEX, document: log });
    } catch (err) {
      this.logger.warn(`Failed to index test run: ${(err as Error).message}`);
    }
  }

  async searchTestRuns(userId: string, query?: string): Promise<TestRunLog[]> {
    if (!this.enabled) return [];

    const must: object[] = [{ term: { userId } }];

    if (query) {
      must.push({
        multi_match: {
          query,
          fields: ['scenario', 'provider', 'paymentStatus', 'errorMessage'],
        },
      });
    }

    try {
      const res = await this.client.search<TestRunLog>({
        index: RUNS_INDEX,
        query: { bool: { must } },
        sort: [{ createdAt: { order: 'desc' } }],
        size: 50,
      });

      return res.hits.hits.map((h) => h._source as TestRunLog);
    } catch (err) {
      this.logger.warn(`Failed to search test runs: ${(err as Error).message}`);
      return [];
    }
  }

  async indexTransaction(userId: string, doc: ElasticTransactionDoc): Promise<void> {
    if (!this.enabled) return;
    try {
      await this.client.index({
        index: TRANSACTIONS_INDEX,
        id: doc.transactionId,
        document: {
          userId,
          ...doc,
        },
      });
    } catch (err) {
      this.logger.warn(`Failed to index transaction: ${(err as Error).message}`);
    }
  }

  async deleteTransactionIndex(transactionId: string): Promise<void> {
    if (!this.enabled) return;
    try {
      await this.client.delete({
        index: TRANSACTIONS_INDEX,
        id: transactionId,
      });
    } catch (err) {
      this.logger.warn(`Failed to delete transaction index: ${(err as Error).message}`);
    }
  }

  async searchTransactionCandidates(
    userId: string,
    params: { customerName: string; amount: number; currency: string },
  ): Promise<TransactionMatchCandidate[]> {
    if (!this.enabled) return [];

    // Allow amount tolerance for payment gateway processing fees (up to 6% deduction)
    const minAmount = params.amount * 0.94;
    const maxAmount = params.amount;

    const must: object[] = [
      { term: { userId } },
      { term: { currency: params.currency.toUpperCase() } },
    ];

    const should: object[] = [
      // Fuzzy search on customer name
      {
        match: {
          customerName: {
            query: params.customerName,
            fuzziness: 'AUTO',
          },
        },
      },
      // Exact name match (boosted score)
      {
        match_phrase: {
          customerName: {
            query: params.customerName,
            boost: 2.0,
          },
        },
      },
      // Range check on amount (to capture exact or fee-reduced payments)
      {
        range: {
          amount: {
            gte: minAmount,
            lte: maxAmount,
            boost: 1.5,
          },
        },
      },
    ];

    try {
      const res = await this.client.search<ElasticTransactionDoc & { userId: string }>({
        index: TRANSACTIONS_INDEX,
        query: {
          bool: {
            must,
            should,
            minimum_should_match: 1, // must match at least one of the should criteria (e.g. name or amount range)
          },
        },
        size: 5,
      });

      return res.hits.hits.map((h) => ({
        ...(h._source as ElasticTransactionDoc),
        score: h._score ?? 0,
      }));
    } catch (err) {
      this.logger.warn(`Failed to search transaction candidates: ${(err as Error).message}`);
      return [];
    }
  }

  private async ensureIndices() {
    await this.ensureIndex(RUNS_INDEX, {
      userId: { type: 'keyword' },
      scenario: { type: 'text' },
      provider: { type: 'keyword' },
      selectedCard: { type: 'keyword' },
      paymentStatus: { type: 'keyword' },
      chargeId: { type: 'keyword' },
      webhookFired: { type: 'boolean' },
      webhookStatusCode: { type: 'integer' },
      webhookDurationMs: { type: 'integer' },
      webhookError: { type: 'text' },
      errorCode: { type: 'keyword' },
      errorMessage: { type: 'text' },
      createdAt: { type: 'date' },
    });

    await this.ensureIndex(TRANSACTIONS_INDEX, {
      userId: { type: 'keyword' },
      transactionId: { type: 'keyword' },
      provider: { type: 'keyword' },
      providerTransactionId: { type: 'keyword' },
      amount: { type: 'double' },
      currency: { type: 'keyword' },
      paidAt: { type: 'date' },
      customerName: { type: 'text', fields: { keyword: { type: 'keyword' } } },
      customerEmail: { type: 'keyword' },
      description: { type: 'text' },
    });
  }

  private async ensureIndex(indexName: string, properties: Record<string, any>) {
    if (!this.enabled) return;
    try {
      const exists = await this.client.indices.exists({ index: indexName });
      if (exists) return;

      await this.client.indices.create({
        index: indexName,
        mappings: {
          properties,
        },
      });
      this.logger.log(`Created index: ${indexName}`);
    } catch (err) {
      this.logger.warn(`Failed to create index ${indexName}: ${(err as Error).message}`);
    }
  }
}
