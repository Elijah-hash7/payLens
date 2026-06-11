import { Injectable, Logger } from '@nestjs/common';
import { ElasticService } from '../elastic/elastic.service';

export interface ArizeSpan {
  agentName: 'DevStudioAgent' | 'ReconStudioAgent';
  taskName: string;
  model: string;
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
  evaluation?: 'PASS' | 'FAIL' | 'FLAGGED';
  metadata?: Record<string, any>;
}

@Injectable()
export class ArizeService {
  private readonly logger = new Logger(ArizeService.name);

  constructor(private readonly elasticService: ElasticService) {}

  /**
   * Logs a simulated OpenTelemetry/Arize trace span for agent operations.
   */
  async logSpan(span: ArizeSpan): Promise<void> {
    const timestamp = new Date().toISOString();
    
    // Log to standard NestJS console as an Arize Span Trace
    this.logger.log(
      `[Arize Monitor] Logged Trace Span: ${span.agentName} | Task: ${span.taskName} | Model: ${span.model} | Latency: ${span.latencyMs}ms | Eval: ${span.evaluation || 'RECORDED'}`
    );

    // Save evaluation logs inside Elasticsearch if enabled (to display in administrative stats)
    try {
      if (this.elasticService['enabled']) {
        await this.elasticService['client'].index({
          index: 'paylens-arize-traces',
          document: {
            timestamp,
            ...span,
          },
        });
      }
    } catch (err) {
      // Swallowed to prevent interrupting core payment transactions
      this.logger.debug(`Failed to index Arize trace log: ${err.message}`);
    }
  }

  /**
   * Evaluates matching accuracy drift. If average confidence drops below a threshold, triggers an alert.
   */
  evaluateAccuracyDrift(matches: Array<{ confidence: number }>): { status: string; driftDetected: boolean; averageConfidence: number } {
    if (matches.length === 0) {
      return { status: 'OPTIMAL', driftDetected: false, averageConfidence: 1.0 };
    }

    const totalConfidence = matches.reduce((sum, m) => sum + m.confidence, 0);
    const averageConfidence = totalConfidence / matches.length;
    const driftDetected = averageConfidence < 0.75; // Drift alert if confidence drops below 75%

    if (driftDetected) {
      this.logger.warn(
        `[Arize Alert] Agent Drift Detected! Average reconciliation matching confidence is down to ${(averageConfidence * 100).toFixed(1)}%. Triggering model re-evaluation alert.`
      );
    }

    return {
      status: driftDetected ? 'WARNING_ACCURACY_DRIFT' : 'OPTIMAL',
      driftDetected,
      averageConfidence,
    };
  }
}
