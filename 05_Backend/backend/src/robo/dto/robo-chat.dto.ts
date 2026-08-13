import { IsArray, IsIn, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class RoboChatMessageDto {
  @IsIn(['user', 'assistant'])
  role!: 'user' | 'assistant';

  @IsString()
  @MaxLength(4000)
  content!: string;
}

export class RoboChatRequestDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoboChatMessageDto)
  messages!: RoboChatMessageDto[];

  @IsOptional()
  @IsString()
  @MaxLength(80)
  requestedTool?: string;
}

export class RoboChatResponseDto {
  reply!: string;
  language!: 'gu' | 'hi' | 'en';
  state!: string;
  guideId?: string;
  provider!: string;
  toolsUsed!: string[];
}
