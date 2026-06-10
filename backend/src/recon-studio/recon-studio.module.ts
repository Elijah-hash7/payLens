import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReconStudioService } from './recon-studio.service';
import { ReconStudioController } from './recon-studio.controller';
import { Invoice, InvoiceSchema } from '../schemas/invoice.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: Invoice.name, schema: InvoiceSchema }])],
  controllers: [ReconStudioController],
  providers: [ReconStudioService],
  exports: [ReconStudioService],
})
export class ReconStudioModule {}
