import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Query,
} from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('campaigns')
export class CampaignsController {
    constructor(private readonly campaignsService: CampaignsService) { }

    @Roles('Admin', 'Manager')
    @Post()
    create(@Body() createCampaignDto: CreateCampaignDto) {
        return this.campaignsService.create(createCampaignDto);
    }

    @Roles('Admin', 'Manager', 'Agent')
    @Get()
    findAll(@Query('accountId') accountId?: string) {
        return this.campaignsService.findAll(accountId);
    }

    @Roles('Admin', 'Manager', 'Agent')
    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.campaignsService.findOne(id);
    }

    @Roles('Admin', 'Manager', 'Agent')
    @Get(':id/metrics')
    getMetrics(@Param('id') id: string) {
        return this.campaignsService.getMetrics(id);
    }

    @Roles('Admin', 'Manager')
    @Patch(':id/lists')
    assignLists(
        @Param('id') id: string,
        @Body('listIds') listIds: string[],
    ) {
        return this.campaignsService.assignLists(id, listIds || []);
    }

    @Roles('Admin', 'Manager', 'Agent')
    @Get(':id/lists')
    getAssignedLists(@Param('id') id: string) {
        return this.campaignsService.getAssignedLists(id);
    }

    @Roles('Admin', 'Manager')
    @Patch(':id')
    update(@Param('id') id: string, @Body() updateCampaignDto: UpdateCampaignDto) {
        return this.campaignsService.update(id, updateCampaignDto);
    }

    @Roles('Admin')
    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.campaignsService.remove(id);
    }
}
