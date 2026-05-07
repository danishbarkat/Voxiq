import {
    Controller,
    Get,
    Post,
    Delete,
    Param,
    Body,
    UseInterceptors,
    UploadedFile,
    BadRequestException,
    Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { VoicemailService } from './voicemail.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateVoicemailDto } from './voicemail.dto';

@Controller('voicemail')
export class VoicemailController {
    constructor(private readonly voicemailService: VoicemailService) { }

    @Roles('Admin', 'Manager', 'Agent')
    @Post('templates')
    @UseInterceptors(FileInterceptor('file'))
    async uploadTemplate(
        @UploadedFile() file: Express.Multer.File,
        @Body() body: CreateVoicemailDto,
    ) {
        if (!file) {
            throw new BadRequestException('No file uploaded');
        }

        if (!body.name || !body.accountId) {
            throw new BadRequestException('name and accountId are required');
        }

        return this.voicemailService.uploadVoicemailAudio(file, body.name, body.accountId);
    }

    @Roles('Admin', 'Manager', 'Agent')
    @Get('templates')
    async getTemplates(@Query('accountId') accountId?: string) {
        return this.voicemailService.getVoicemailTemplates(accountId);
    }

    @Roles('Admin', 'Manager', 'Agent')
    @Get('templates/:id')
    async getTemplate(@Param('id') id: string) {
        return this.voicemailService.getTemplate(id);
    }

    @Roles('Admin', 'Manager', 'Agent')
    @Get('templates/:id/playback')
    async getPlaybackUrl(@Param('id') id: string) {
        const url = await this.voicemailService.getPlaybackUrl(id);
        return { url };
    }

    @Roles('Admin', 'Manager')
    @Delete('templates/:id')
    async deleteTemplate(
        @Param('id') id: string,
        @Body('accountId') accountId: string,
    ) {
        await this.voicemailService.deleteTemplate(id, accountId);
        return { message: 'Template deleted successfully' };
    }
}
