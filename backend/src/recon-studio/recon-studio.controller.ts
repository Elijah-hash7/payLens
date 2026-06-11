import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ReconStudioService } from './recon-studio.service';

@Controller('recon-studio')
export class ReconStudioController {
  constructor(private readonly reconStudioService: ReconStudioService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadInvoices(
    @UploadedFile() file: Express.Multer.File,
    @Query('userId') userId: string,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    if (!userId) throw new BadRequestException('userId query param required');
    return this.reconStudioService.uploadInvoicesCsv(userId, file.buffer);
  }

  @Post('transactions')
  seedTransaction(
    @Query('userId') userId: string,
    @Body() body: {
      provider: string;
      providerTransactionId: string;
      amount: number;
      currency: string;
      paidAt: string;
      customerName?: string;
      description?: string;
    },
  ) {
    if (!userId) throw new BadRequestException('userId query param required');
    return this.reconStudioService.seedTransaction(userId, body);
  }

  @Post('reconcile')
  reconcile(@Query('userId') userId: string) {
    if (!userId) throw new BadRequestException('userId query param required');
    return this.reconStudioService.reconcile(userId);
  }

  @Get('invoices')
  getInvoices(@Query('userId') userId: string) {
    if (!userId) throw new BadRequestException('userId query param required');
    return this.reconStudioService.getInvoices(userId);
  }
}
