import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@elastic/elasticsearch';

const INDEX = 'paylens-test-runs';

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
      await this.ensureIndex();
      this.logger.log('Elasticsearch connected');
    } catch (err) {
      this.logger.warn(`Elasticsearch not reachable: ${(err as Error).message}`);
    }
  }

  async indexTestRun(log: TestRunLog): Promise<void> {
    if (!this.enabled) return;
    try {
      await this.client.index({ index: INDEX, document: log });
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
      index: INDEX,
      query: { bool: { must } },
      sort: [{ createdAt: { order: 'desc' } }],
      size: 50,
    });

    return res.hits.hits.map((h) => h._source as TestRunLog);
  }

  private async ensureIndex() {
    if (!this.enabled) return;
    const exists = await this.client.indices.exists({ index: INDEX });
    if (exists) return;

    await this.client.indices.create({
      index: INDEX,
      mappings: {
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
      },
    });

    this.logger.log(`Created index: ${INDEX}`);
  }
}
