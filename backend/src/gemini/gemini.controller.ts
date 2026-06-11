import { Controller, Get } from '@nestjs/common';
import { GeminiService } from './gemini.service';

@Controller('gemini')
export class GeminiController {
  constructor(private readonly geminiService: GeminiService) {}

  @Get('ping')
  async ping(): Promise<{ message: string }> {
    const message = await this.geminiService.prompt(
      'Respond with exactly: "PayLens Gemini connection confirmed." — nothing else.',
    );
    return { message };
  }
}
