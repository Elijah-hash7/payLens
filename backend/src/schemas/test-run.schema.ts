import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type TestRunDocument = HydratedDocument<TestRun>;

export class WebhookResult {
  statusCode: number;
  body: Record<string, unknown>;
  durationMs: number;
  error?: string;
}

// Dev Studio: one test run = one scenario executed by the agent
@Schema({ timestamps: true })
export class TestRun {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'ApiConnection', required: true })
  apiConnectionId: Types.ObjectId;

  @Prop({ required: true, enum: ['stripe', 'paystack'] })
  provider: string;

  // Plain-English input from the developer
  @Prop({ required: true })
  scenario: string;

  // Test card the agent selected
  @Prop()
  testCard?: string;

  // Raw result from the payment sandbox
  @Prop({ type: Object })
  paymentResult?: Record<string, unknown>;

  // Webhook fire result
  @Prop({ type: Object })
  webhookResult?: WebhookResult;

  // Gemini plain-English explanation
  @Prop()
  geminiExplanation?: string;

  @Prop({
    required: true,
    enum: ['pending', 'success', 'failed', 'error'],
    default: 'pending',
  })
  status: string;
}

export const TestRunSchema = SchemaFactory.createForClass(TestRun);
