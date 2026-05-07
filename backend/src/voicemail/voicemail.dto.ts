import { IsString, IsNotEmpty } from 'class-validator';

export class CreateVoicemailDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    accountId: string;
}
