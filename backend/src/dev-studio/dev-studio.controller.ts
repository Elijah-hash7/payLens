import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { DevStudioService } from './dev-studio.service';
import { ElasticService } from '../elastic/elastic.service';
import type { RunTestParams } from './dev-studio.service';

@Controller('dev-studio')
export class DevStudioController {
  constructor(
    private readonly devStudioService: DevStudioService,
    private readonly elasticService: ElasticService,
  ) {}

  @Post('run')
  run(@Body() body: RunTestParams) {
    return this.devStudioService.runTest(body);
  }

  @Get('history')
  history(
    @Query('userId') userId: string,
    @Query('q') query?: string,
  ) {
    return this.elasticService.searchTestRuns(userId, query);
  }
}
