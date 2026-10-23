import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class ConvertQuoteDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @ApiPropertyOptional({ description: 'Cria agendamento junto com a OS' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  schedule?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  startsAt?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  endsAt?: Date;
}
