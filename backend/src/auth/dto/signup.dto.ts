import { IsEmail, IsInt, IsString, Min, MinLength } from 'class-validator';

export class SignupDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  @MinLength(1)
  lastName: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @MinLength(1)
  phone: string;

  @IsString()
  @MinLength(1)
  companyName: string;

  @IsString()
  @MinLength(1)
  adminCode: string;

  @IsInt()
  @Min(1)
  requestedAgentLimit: number;

  @IsInt()
  @Min(1)
  requestedNumbers: number;
}
