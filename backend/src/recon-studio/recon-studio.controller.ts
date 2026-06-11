import {
  Controller,
  Post,
  Get,
  Param,
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

  @Post('sync')
  @UseGuards(OptionalJwtAuthGuard)
  async syncTransactions(@Req() req: any) {
    const userId = req.user?.userId ?? 'anonymous';
    return this.reconStudioService.syncTransactions(userId);
  }

  @Post('reconcile')
  @UseGuards(OptionalJwtAuthGuard)
  async reconcile(@Req() req: any) {
    const userId = req.user?.userId ?? 'anonymous';
    return this.reconStudioService.runReconciliation(userId);
  }

  @Get('matches')
  @UseGuards(OptionalJwtAuthGuard)
  async getMatches(@Req() req: any) {
    const userId = req.user?.userId ?? 'anonymous';
    return this.reconStudioService.getMatches(userId);
  }

  @Post('matches/:id/approve')
  @UseGuards(OptionalJwtAuthGuard)
  async approveMatch(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.userId ?? 'anonymous';
    return this.reconStudioService.approveMatch(userId, id);
  }

  @Post('matches/:id/reject')
  @UseGuards(OptionalJwtAuthGuard)
  async rejectMatch(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.userId ?? 'anonymous';
    return this.reconStudioService.rejectMatch(userId, id);
  }

  @Get('reports')
  @UseGuards(OptionalJwtAuthGuard)
  async getReports(@Req() req: any) {
    const userId = req.user?.userId ?? 'anonymous';
    return this.reconStudioService.getReport(userId);
  }
}
