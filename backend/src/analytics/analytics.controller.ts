import { Controller, Get, Param, Query, Res, Patch, Body, Req } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import type { Response } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('analytics')
export class AnalyticsController {
    constructor(private readonly analyticsService: AnalyticsService) { }

    @Roles('Admin', 'Manager', 'Agent')
    @Get('overview')
    getOverview(@Req() req: any) {
        return this.analyticsService.getOverview(req?.user);
    }

    @Roles('Admin', 'Manager', 'Agent')
    @Get('hourly')
    getHourly(@Query('date') date?: string, @Req() req?: any) {
        return this.analyticsService.getHourlyStats(date, req?.user);
    }

    @Roles('Admin', 'Manager')
    @Get('export')
    async exportCsv(
        @Query('start') start: string,
        @Query('end') end: string,
        @Res() res: Response,
        @Req() req?: any,
    ) {
        const csv = await this.analyticsService.exportCsv(
            start ? new Date(start) : undefined,
            end ? new Date(end) : undefined,
            req?.user,
        );
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="calls-export-${Date.now()}.csv"`);
        res.send(csv);
    }

    @Roles('Admin', 'Manager')
    @Get('agents/scores')
    getAgentScores(@Req() req?: any) {
        return this.analyticsService.getAllAgentScores(req?.user);
    }

    @Roles('Admin', 'Manager')
    @Get('recordings')
    getRecordings(
        @Query('limit') limit?: string,
        @Query('phone') phone?: string,
        @Query('agentId') agentId?: string,
        @Query('dateFrom') dateFrom?: string,
        @Query('dateTo') dateTo?: string,
        @Req() req?: any,
    ) {
        return this.analyticsService.getRecordings({
            limit: limit ? parseInt(limit) : 200,
            phone,
            agentId,
            dateFrom,
            dateTo,
        }, req?.user);
    }

    @Roles('Admin', 'Manager', 'Agent')
    @Get('history')
    getHistory(
        @Query('limit') limit?: string,
        @Req() req?: any,
    ) {
        return this.analyticsService.getHistory({
            limit: limit ? parseInt(limit) : 150,
        }, req?.user);
    }

    @Roles('Admin', 'Manager')
    @Get('heatmap')
    getHeatmap(@Req() req?: any) {
        return this.analyticsService.getStateHeatmap(req?.user);
    }

    @Roles('Admin', 'Manager')
    @Patch('recordings/:id/tags')
    updateTags(@Param('id') id: string, @Body('tags') tags: string[], @Req() req?: any) {
        return this.analyticsService.updateCallTags(id, tags, req?.user);
    }

    @Roles('Admin', 'Manager')
    @Get('campaign/:id')
    getCampaignStats(
        @Param('id') id: string,
        @Query('start') start?: string,
        @Query('end') end?: string,
        @Req() req?: any,
    ) {
        return this.analyticsService.getCampaignStats(id, start ? new Date(start) : undefined, end ? new Date(end) : undefined, req?.user);
    }

    @Roles('Admin', 'Manager')
    @Get('agent/:id')
    getAgentStats(
        @Param('id') id: string,
        @Query('start') start?: string,
        @Query('end') end?: string,
        @Req() req?: any,
    ) {
        return this.analyticsService.getAgentStats(id, start ? new Date(start) : undefined, end ? new Date(end) : undefined, req?.user);
    }
}
