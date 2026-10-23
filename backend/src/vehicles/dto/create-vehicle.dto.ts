import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export class CreateVehicleDto {
  @ApiProperty()
  @IsUUID()
  customerId: string;

  @ApiProperty()
  @IsString()
  @MaxLength(80)
  brand: string;

  @ApiProperty()
  @IsString()
  @MaxLength(120)
  model: string;

  @ApiProperty()
  @IsString()
  @MaxLength(10)
  plate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1900)
  manufactureYear?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1900)
  modelYear?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  color?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  chassis?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
