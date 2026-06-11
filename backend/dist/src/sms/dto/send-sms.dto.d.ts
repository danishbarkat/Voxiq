export declare class SendSmsDto {
    to: string;
    body: string;
    from?: string;
    channel?: 'sms' | 'whatsapp';
}
