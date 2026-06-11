import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@elastic/elasticsearch';

const TEST_RUNS_INDEX = 'paylens-test-runs';
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

export interface TransactionLog {
  userId: string;
  provider: string;
  providerTransactionId: string;
  amount: number;
  currency: string;
  paidAt: string;
  customerName?: string;
  description?: string;
}

export interface FuzzyMatchResult {
  transactionId: string;
  score: number;
  transaction: TransactionLog;
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
      await this.ensureIndex(TEST_RUNS_INDEX, testRunsMappings);
      await this.ensureIndex(TRANSACTIONS_INDEX, transactionsMappings);
      this.logger.log('Elasticsearch connected');
    } catch (err) {
      this.logger.warn(`Elasticsearch not reachable: ${(err as Error).message}`);
    }
  }

  // ── Test runs ────────────────────────────────────────────────────────────

  async indexTestRun(log: TestRunLog): Promise<void> {
    if (!this.enabled) return;
    try {
      await this.client.index({ index: TEST_RUNS_INDEX, document: log });
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
    const res = await this.client.search<TestRunLog>({
      index: TEST_RUNS_INDEX,
      query: { bool: { must } },
      sort: [{ createdAt: { order: 'desc' } }],
      size: 50,
    });
    return res.hits.hits.map((h) => h._source as TestRunLog);
  }

  // ── Transactions ─────────────────────────────────────────────────────────

  async indexTransaction(log: TransactionLog): Promise<string> {
    if (!this.enabled) return '';
    const res = await this.client.index({ index: TRANSACTIONS_INDEX, document: log });
    return res._id;
  }

  async fuzzyMatchForInvoice(
    userId: string,
    invoice: { customerName: string; amount: number; currency: string },
  ): Promise<FuzzyMatchResult[]> {
    if (!this.enabled) return [];

    const amountMin = invoice.amount * 0.95;
    const amountMax = invoice.amount * 1.05;

    const res = await this.client.search<TransactionLog>({
      index: TRANSACTIONS_INDEX,
      query: {
        bool: {
          must: [
            { term: { userId } },
            { term: { currency: invoice.currency.toUpperCase() } },
            { range: { amount: { gte: amountMin, lte: amountMax } } },
          ],
          should: [
            {
              match: {
                customerName: {
                  query: invoice.customerName,
                  fuzziness: 'AUTO',
                  boost: 2,
                },
              },
            },
            {
              match: {
                description: {
                  query: invoice.customerName,
                  fuzziness: 'AUTO',
                },
              },
            },
          ],
          minimum_should_match: 0,
        },
      },
      size: 5,
    });

    return res.hits.hits.map((h) => ({
      transactionId: h._id as string,
      score: h._score ?? 0,
      transaction: h._source as TransactionLog,
    }));
  }

  // ── Shared ────────────────────────────────────────────────────────────────

  private async ensureIndex(index: string, mappings: object) {
    if (!this.enabled) return;
    const exists = await this.client.indices.exists({ index });
    if (exists) return;
    await this.client.indices.create({ index, mappings });
    this.logger.log(`Created index: ${index}`);
  }
}

const testRunsMappings = {
  properties: {
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
  },
};

const transactionsMappings = {
  properties: {
    userId: { type: 'keyword' },
    provider: { type: 'keyword' },
    providerTransactionId: { type: 'keyword' },
    amount: { type: 'float' },
    currency: { type: 'keyword' },
    paidAt: { type: 'date' },
    customerName: { type: 'text' },
    description: { type: 'text' },
  },
};
