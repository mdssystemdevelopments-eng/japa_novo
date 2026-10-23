import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RoleCode, UserStatus } from '@prisma/client';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty()
  @IsString()
  fullName: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ enum: RoleCode, isArray: true })
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(RoleCode, { each: true })
  roles: RoleCode[];

  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}
