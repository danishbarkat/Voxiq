import { IsBoolean, IsEmail, IsInt, IsOptional, IsString, Matches, MaxLength, Min, MinLength } from 'class-validator';

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
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_#^()\-+=~`|\\:;"'<>,./\[\]{}])[A-Za-z\d@$!%*?&_#^()\-+=~`|\\:;"'<>,./\[\]{}]{8,}$/,
    { message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character' }
  )
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

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  ntn?: string;

  @IsBoolean()
  termsAccepted: boolean;
}
