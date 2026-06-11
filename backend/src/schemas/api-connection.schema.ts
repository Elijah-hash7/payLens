import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ApiConnectionDocument = HydratedDocument<ApiConnection>;

// Stores a user's payment provider credentials for Dev Studio or Recon Studio
@Schema({ timestamps: true })
export class ApiConnection {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, enum: ['stripe', 'paystack'] })
  provider: string;

  @Prop({ required: true })
  testApiKey: string;

  // Dev Studio: where webhooks get fired
  @Prop()
  webhookEndpointUrl?: string;

  @Prop({ default: 'dev_studio', enum: ['dev_studio', 'recon_studio'] })
  studio: string;
}

export const ApiConnectionSchema = SchemaFactory.createForClass(ApiConnection);
