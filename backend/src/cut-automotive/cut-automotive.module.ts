import { Module } from '@nestjs/common';
import { CutAutomotiveController } from './cut-automotive.controller';
import { CutAutomotiveService } from './cut-automotive.service';

@Module({
  controllers: [CutAutomotiveController],
  providers: [CutAutomotiveService],
})
export class CutAutomotiveModule {}
