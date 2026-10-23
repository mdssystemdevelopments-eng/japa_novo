import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsString, ValidateNested } from 'class-validator';

class ChecklistEntry {
  @ApiProperty()
  @IsString()
  key: string;

  @ApiProperty()
  @IsString()
  label: string;

  @ApiProperty()
  @IsBoolean()
  done: boolean;
}

export class UpdateChecklistDto {
  @ApiProperty({ type: [ChecklistEntry] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistEntry)
  checklist: ChecklistEntry[];
}
