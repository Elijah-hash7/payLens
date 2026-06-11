import { Controller, Post, Get, Body, Query, UseGuards, Req } from '@nestjs/common';
import { DevStudioService } from './dev-studio.service';
import { ElasticService } from '../elastic/elastic.service';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import type { RunTestParams } from './dev-studio.service';

@Controller('dev-studio')
export class DevStudioController {
  constructor(
    private readonly devStudioService: DevStudioService,
    private readonly elasticService: ElasticService,
  ) {}

  @Post('run')
  @UseGuards(OptionalJwtAuthGuard)
  run(@Body() body: RunTestParams, @Req() req: any) {
    const userId = req.user?.userId ?? 'anonymous';
    return this.devStudioService.runTest({ ...body, userId });
  }

  @Get('history')
  @UseGuards(OptionalJwtAuthGuard)
  history(
    @Req() req: any,
    @Query('q') query?: string,
  ) {
    const userId = req.user?.userId ?? 'anonymous';
    return this.elasticService.searchTestRuns(userId, query);
  }
}

