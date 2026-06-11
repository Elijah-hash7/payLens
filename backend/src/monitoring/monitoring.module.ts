import { Module } from '@nestjs/common';
import { ArizeService } from './arize.service';
import { ElasticModule } from '../elastic/elastic.module';

@Module({
  imports: [ElasticModule],
  providers: [ArizeService],
  exports: [ArizeService],
})
export class MonitoringModule {}
