import { Controller, Get, Param, Query, Res, SetMetadata, Patch, Body } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import type { Response } from 'express';

@Controller('analytics')
export class AnalyticsController {
    constructor(private readonly analyticsService: AnalyticsService) { }

    @SetMetadata('isPublic', true)
    @Get('overview')
    getOverview() {
        return this.analyticsService.getOverview();
    }

    @SetMetadata('isPublic', true)
    @Get('hourly')
    getHourly(@Query('date') date?: string) {
        return this.analyticsService.getHourlyStats(date);
    }

    @SetMetadata('isPublic', true)
    @Get('export')
    async exportCsv(
        @Query('start') start: string,
        @Query('end') end: string,
        @Res() res: Response,
    ) {
        const csv = await this.analyticsService.exportCsv(
            start ? new Date(start) : undefined,
            end ? new Date(end) : undefined,
        );
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="calls-export-${Date.now()}.csv"`);
        res.send(csv);
    }

    @SetMetadata('isPublic', true)
    @Get('agents/scores')
    getAgentScores() {
        return this.analyticsService.getAllAgentScores();
    }

    @SetMetadata('isPublic', true)
    @Get('recordings')
    getRecordings(
        @Query('limit') limit?: string,
        @Query('phone') phone?: string,
        @Query('agentId') agentId?: string,
        @Query('dateFrom') dateFrom?: string,
        @Query('dateTo') dateTo?: string,
    ) {
        return this.analyticsService.getRecordings({
            limit: limit ? parseInt(limit) : 200,
            phone,
            agentId,
            dateFrom,
            dateTo,
        });
    }

    @SetMetadata('isPublic', true)
    @Get('heatmap')
    getHeatmap() {
        return this.analyticsService.getStateHeatmap();
    }

    @SetMetadata('isPublic', true)
    @Patch('recordings/:id/tags')
    updateTags(@Param('id') id: string, @Body('tags') tags: string[]) {
        return this.analyticsService.updateCallTags(id, tags);
    }

    @SetMetadata('isPublic', true)
    @Get('campaign/:id')
    getCampaignStats(
        @Param('id') id: string,
        @Query('start') start?: string,
        @Query('end') end?: string,
    ) {
        return this.analyticsService.getCampaignStats(id, start ? new Date(start) : undefined, end ? new Date(end) : undefined);
    }

    @SetMetadata('isPublic', true)
    @Get('agent/:id')
    getAgentStats(
        @Param('id') id: string,
        @Query('start') start?: string,
        @Query('end') end?: string,
    ) {
        return this.analyticsService.getAgentStats(id, start ? new Date(start) : undefined, end ? new Date(end) : undefined);
    }
}
