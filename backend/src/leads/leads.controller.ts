import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Query,
    UseInterceptors,
    UploadedFile,
    BadRequestException,
    SetMetadata,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { LeadStatus } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('leads')
export class LeadsController {
    constructor(private readonly leadsService: LeadsService) { }

    @Roles('Admin', 'Manager')
    @Post('import')
    @UseInterceptors(FileInterceptor('file'))
    async importCsv(
        @UploadedFile() file: Express.Multer.File,
        @Body('accountId') accountId: string,
        @Body('listId') listId?: string,
        @Body('newListName') newListName?: string,
    ) {
        if (!file) {
            throw new BadRequestException('No file uploaded');
        }

        if (!accountId) {
            throw new BadRequestException('accountId is required');
        }

        if (!listId && !newListName) {
            throw new BadRequestException('Either listId or newListName is required');
        }

        const result = await this.leadsService.importCsv(file, accountId, listId, newListName);
        return {
            message: 'Import completed',
            ...result,
        };
    }

    @Roles('Admin', 'Manager')
    @Post()
    create(@Body() createLeadDto: CreateLeadDto) {
        return this.leadsService.create(createLeadDto);
    }

    @SetMetadata('isPublic', true)
    @Get()
    findAll(
        @Query('accountId') accountId?: string,
        @Query('listId') listId?: string,
        @Query('status') status?: LeadStatus,
        @Query('agentId') agentId?: string,
        @Query('limit') limit?: string,
        @Query('offset') offset?: string,
    ) {
        return this.leadsService.findAll({
            accountId,
            listId,
            status,
            agentId,
            limit: limit ? parseInt(limit) : undefined,
            offset: offset ? parseInt(offset) : undefined,
        });
    }

    // IMPORTANT: Static routes ('accounts', 'lists') MUST come BEFORE dynamic ':id' route
    @Roles('Admin', 'Manager')
    @Get('lists')
    findAllLists(@Query('accountId') accountId?: string) {
        return this.leadsService.findAllLists(accountId);
    }

    @Roles('Admin')
    @Get('accounts')
    findAllAccounts() {
        return this.leadsService.findAllAccounts();
    }

    @Roles('Admin')
    @Post('accounts')
    createAccount(@Body('name') name: string) {
        if (!name) throw new BadRequestException('Account name is required');
        return this.leadsService.createAccount(name);
    }

    @Roles('Admin')
    @Patch('accounts/:id')
    updateAccount(@Param('id') id: string, @Body() data: { name?: string; numberPool?: any }) {
        return this.leadsService.updateAccount(id, data);
    }

    @Roles('Admin')
    @Delete('accounts/:id')
    deleteAccount(@Param('id') id: string) {
        return this.leadsService.deleteAccount(id);
    }

    @Roles('Admin', 'Manager')
    @Post('lists')
    createList(
        @Body('name') name: string,
        @Body('accountId') accountId: string,
        @Body('description') description?: string,
    ) {
        if (!name || !accountId) {
            throw new BadRequestException('list name and accountId are required');
        }
        return this.leadsService.createList({ name, accountId, description });
    }

    // Dynamic ':id' routes AFTER static routes
    @Roles('Admin', 'Manager', 'Agent')
    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.leadsService.findOne(id);
    }

    @Roles('Admin', 'Manager', 'Agent')
    @Get(':id/history')
    getCallHistory(@Param('id') id: string) {
        return this.leadsService.getCallHistory(id);
    }

    @Roles('Admin', 'Manager')
    @Patch(':id')
    update(@Param('id') id: string, @Body() updateLeadDto: UpdateLeadDto) {
        return this.leadsService.update(id, updateLeadDto);
    }

    @Roles('Admin', 'Manager', 'Agent')
    @Patch(':id/status')
    updateStatus(
        @Param('id') id: string,
        @Body('status') status: LeadStatus,
    ) {
        return this.leadsService.updateStatus(id, status);
    }

    @Roles('Admin', 'Manager')
    @Delete('lists/:id')
    removeList(@Param('id') id: string) {
        return this.leadsService.deleteList(id);
    }

    @Roles('Admin', 'Manager')
    @Delete(':id')
    removeLead(@Param('id') id: string) {
        return this.leadsService.deleteLead(id);
    }

    @Roles('Admin')
    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.leadsService.remove(id);
    }
}
