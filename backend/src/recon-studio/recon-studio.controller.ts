import {
  Controller,
  Post,
  Get,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  UseGuards,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { ReconStudioService } from './recon-studio.service';

@Controller('recon-studio')
export class ReconStudioController {
  constructor(private readonly reconStudioService: ReconStudioService) {}

  @Post('upload')
  @UseGuards(OptionalJwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadInvoices(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    const userId = req.user?.userId ?? 'anonymous';
    return this.reconStudioService.uploadInvoicesCsv(userId, file.buffer);
  }

  @Get('invoices')
  @UseGuards(OptionalJwtAuthGuard)
  getInvoices(@Req() req: any) {
    const userId = req.user?.userId ?? 'anonymous';
    return this.reconStudioService.getInvoices(userId);
  }
}

