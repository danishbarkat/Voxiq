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
    Req,
    Res,
} from '@nestjs/common';
import { Response } from 'express';
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
    @Get('import/template')
    downloadTemplate(@Res() res: Response) {
        const headers = ['firstName', 'lastName', 'phone', 'address', 'tags', 'email', 'company', 'notes'];
        const sample1 = ['Ali', 'Hassan', '+923001234567', 'House 5 Block A Lahore', 'hot-lead,interested', 'ali@example.com', 'ABC Corp', 'Called before - interested in product'];
        const sample2 = ['Sara', 'Khan', '+923451234567', 'Flat 12 Gulshan Karachi', 'follow-up', 'sara@example.com', 'XYZ Ltd', 'Requested callback on Monday'];
        const sample3 = ['Ahmed', 'Raza', '+923211234567', 'Street 3 G-11 Islamabad', '', '', '', ''];

        const rows = [headers, sample1, sample2, sample3]
            .map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(','))
            .join('\r\n');

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="voxiq-leads-template.csv"');
        res.send('﻿' + rows); // BOM for Excel UTF-8 support
    }

    @Roles('Admin', 'Manager')
    @Post('import')
    @UseInterceptors(FileInterceptor('file'))
    async importCsv(
        @UploadedFile() file: Express.Multer.File,
        @Body('accountId') accountId: string,
        @Body('listId') listId?: string,
        @Body('newListName') newListName?: string,
        @Req() req?: any,
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

        const result = await this.leadsService.importCsv(file, accountId, listId, newListName, req?.user);
        return {
            message: 'Import completed',
            ...result,
        };
    }

    @Roles('Admin', 'Manager')
    @Post()
    create(@Body() createLeadDto: CreateLeadDto, @Req() req: any) {
        return this.leadsService.create(createLeadDto, req?.user);
    }

    @Roles('Admin', 'Manager', 'Agent')
    @Get()
    findAll(
        @Query('accountId') accountId?: string,
        @Query('listId') listId?: string,
        @Query('status') status?: LeadStatus,
        @Query('agentId') agentId?: string,
        @Query('limit') limit?: string,
        @Query('offset') offset?: string,
        @Req() req?: any,
    ) {
        return this.leadsService.findAll({
            accountId,
            listId,
            status,
            agentId,
            limit: limit ? parseInt(limit) : undefined,
            offset: offset ? parseInt(offset) : undefined,
        }, req?.user);
    }

    // IMPORTANT: Static routes ('accounts', 'lists') MUST come BEFORE dynamic ':id' route
    @Roles('Admin', 'Manager')
    @Get('lists')
    findAllLists(@Query('accountId') accountId?: string, @Req() req?: any) {
        return this.leadsService.findAllLists(accountId, req?.user);
    }

    @Roles('Admin')
    @Get('accounts')
    findAllAccounts(@Req() req?: any) {
        return this.leadsService.findAllAccounts(req?.user);
    }

    @Roles('Admin')
    @Post('accounts')
    createAccount(@Body('name') name: string, @Req() req?: any) {
        if (!name) throw new BadRequestException('Account name is required');
        return this.leadsService.createAccount(name, req?.user);
    }

    @Roles('Admin')
    @Patch('accounts/:id')
    updateAccount(@Param('id') id: string, @Body() data: { name?: string; numberPool?: any }, @Req() req?: any) {
        return this.leadsService.updateAccount(id, data, req?.user);
    }

    @Roles('Admin')
    @Delete('accounts/:id')
    deleteAccount(@Param('id') id: string, @Req() req?: any) {
        return this.leadsService.deleteAccount(id, req?.user);
    }

    @Roles('Admin', 'Manager')
    @Post('lists')
    createList(
        @Body('name') name: string,
        @Body('accountId') accountId: string,
        @Body('description') description?: string,
        @Req() req?: any,
    ) {
        if (!name || !accountId) {
            throw new BadRequestException('list name and accountId are required');
        }
        return this.leadsService.createList({ name, accountId, description }, req?.user);
    }

    // Dynamic ':id' routes AFTER static routes
    @Roles('Admin', 'Manager', 'Agent')
    @Get(':id')
    findOne(@Param('id') id: string, @Req() req?: any) {
        return this.leadsService.findOne(id, req?.user);
    }

    @Roles('Admin', 'Manager', 'Agent')
    @Get(':id/history')
    getCallHistory(@Param('id') id: string, @Req() req?: any) {
        return this.leadsService.getCallHistory(id, req?.user);
    }

    @Roles('Admin', 'Manager')
    @Patch(':id')
    update(@Param('id') id: string, @Body() updateLeadDto: UpdateLeadDto, @Req() req?: any) {
        return this.leadsService.update(id, updateLeadDto, req?.user);
    }

    @Roles('Admin', 'Manager', 'Agent')
    @Patch(':id/status')
    updateStatus(
        @Param('id') id: string,
        @Body('status') status: LeadStatus,
        @Req() req?: any,
    ) {
        return this.leadsService.updateStatus(id, status, req?.user);
    }

    @Roles('Admin', 'Manager')
    @Delete('lists/:id')
    removeList(@Param('id') id: string, @Req() req?: any) {
        return this.leadsService.deleteList(id, req?.user);
    }

    @Roles('Admin', 'Manager')
    @Delete(':id')
    removeLead(@Param('id') id: string, @Req() req?: any) {
        return this.leadsService.deleteLead(id, req?.user);
    }
}
