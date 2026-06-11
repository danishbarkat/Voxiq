import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class SendSmsDto {
  @IsString()
  @MinLength(1)
  to: string;

  @IsString()
  @MinLength(1)
  body: string;

  @IsString()
  @IsOptional()
  from?: string;

  @IsString()
  @IsOptional()
  @IsIn(['sms', 'whatsapp'])
  channel?: 'sms' | 'whatsapp';
}
