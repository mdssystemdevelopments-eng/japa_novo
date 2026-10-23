import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

class MaterialInput {
  @ApiPropertyOptional()
  @IsUUID()
  productId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  bobinaId?: string;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  quantity: number;
}

export class CompleteWorkOrderDto {
  @ApiPropertyOptional({ type: [MaterialInput] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MaterialInput)
  materials: MaterialInput[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
