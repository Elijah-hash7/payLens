import { Controller, Post, Body } from '@nestjs/common';
import { DevStudioService } from './dev-studio.service';
import type { RunTestParams } from './dev-studio.service';

@Controller('dev-studio')
export class DevStudioController {
  constructor(private readonly devStudioService: DevStudioService) {}

  @Post('run')
  run(@Body() body: RunTestParams) {
    return this.devStudioService.runTest(body);
  }
}
