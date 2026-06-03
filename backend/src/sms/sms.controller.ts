import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { SendSmsDto } from './dto/send-sms.dto';
import { SmsService } from './sms.service';

@Controller('sms')
export class SmsController {
  constructor(private readonly smsService: SmsService) {}

  @Post('send')
  async send(@Body() dto: SendSmsDto, @Req() req: any) {
    const agentId: string = req.user.userId;
    const accountId: string = req.user.accountId;
    return this.smsService.send(dto.to, dto.body, dto.from, agentId, accountId);
  }

  @Get('conversations')
  async getConversations(@Req() req: any) {
    const accountId: string = req.user.accountId;
    const role: string = (req.user.role || '').toLowerCase();
    const agentId = (role === 'admin' || role === 'superadmin') ? undefined : req.user.userId;
    return this.smsService.getConversations(accountId, agentId);
  }

  @Get('conversations/:number')
  async getThread(@Param('number') number: string, @Req() req: any) {
    const accountId: string = req.user.accountId;
    return this.smsService.getThread(number, accountId);
  }
}
