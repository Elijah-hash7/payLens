import {
  Controller,
  Post,
  Get,
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

  @Get('invoices')
  getInvoices(@Query('userId') userId: string) {
    if (!userId) throw new BadRequestException('userId query param required');
    return this.reconStudioService.getInvoices(userId);
  }
}
