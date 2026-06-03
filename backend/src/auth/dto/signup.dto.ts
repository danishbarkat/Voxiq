import { IsEmail, IsInt, IsOptional, IsString, Matches, MaxLength, Min, MinLength } from 'class-validator';

export class SignupDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  @MinLength(1)
  lastName: string;

  @IsEmail()
  @MaxLength(320)
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9]{7,15}$/, { message: 'Phone number must be 7 to 15 digits' })
  phone?: string;

  @IsString()
  @MinLength(1)
  companyName: string;

  @IsInt()
  @Min(1)
  requestedAgentLimit: number;

  @IsInt()
  @Min(1)
  requestedNumbers: number;
}
