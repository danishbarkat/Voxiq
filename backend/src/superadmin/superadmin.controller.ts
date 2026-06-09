import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Roles } from '../auth/decorators/roles.decorator';
import { SuperAdminService } from './superadmin.service';

class NumberEntryDto {
  @IsString() number: string;
  @IsString() callerName: string;
  @IsString() @IsOptional() areaCode: string;
}

class ApproveDto {
  @IsInt() @Min(1) agentLimit: number;
  @IsArray() @ValidateNested({ each: true }) @Type(() => NumberEntryDto) numberPool: NumberEntryDto[];
  @IsString() @IsOptional() packageName?: string;
}

class RejectDto {
  @IsString() reason: string;
}

@Controller('superadmin')
@Roles('SuperAdmin')
export class SuperAdminController {
  constructor(private readonly superAdminService: SuperAdminService) {}

  @Get('overview')
  getOverview() {
    return this.superAdminService.getOverview();
  }

  @Get('companies')
  getAllCompanies() {
    return this.superAdminService.getAllCompanies();
  }

  @Get('companies/:id/details')
  getCompanyDetails(@Param('id') id: string) {
    return this.superAdminService.getCompanyDetails(id);
  }

  @Post('companies/:id/access-code/regenerate')
  regenerateAccessCode(@Param('id') id: string) {
    return this.superAdminService.regenerateAccessCode(id);
  }

  @Post('companies/:id/approve')
  approveCompany(@Param('id') id: string, @Body() dto: ApproveDto) {
    return this.superAdminService.approveCompany(id, dto.agentLimit, dto.numberPool, dto.packageName);
  }

  @Post('companies/:id/reject')
  rejectCompany(@Param('id') id: string, @Body() dto: RejectDto) {
    return this.superAdminService.rejectCompany(id, dto.reason);
  }

  @Post('companies/:id/deactivate')
  deactivateCompany(@Param('id') id: string) {
    return this.superAdminService.deactivateCompany(id);
  }

  @Post('companies/:id/delete')
  deleteCompany(@Param('id') id: string) {
    return this.superAdminService.deleteCompany(id);
  }

  @Post('companies/:id/activate')
  activateCompany(@Param('id') id: string) {
    return this.superAdminService.activateCompany(id);
  }

  @Get('pending-verifications')
  getPendingVerifications() {
    return this.superAdminService.getPendingVerifications();
  }

  @Post('pending-verifications/:email/resend-otp')
  resendOtp(@Param('email') email: string) {
    return this.superAdminService.regenerateOtp(email);
  }

  @Get('numbers')
  getAvailableNumbers() {
    return this.superAdminService.getAvailableNumbers();
  }

  @Post('companies/:id/assign-numbers')
  assignNumbers(@Param('id') id: string, @Body() dto: ApproveDto) {
    return this.superAdminService.assignNumbers(id, dto.numberPool);
  }

  @Post('companies/:id/unassign-number')
  unassignNumber(@Param('id') id: string, @Body('number') number: string) {
    return this.superAdminService.unassignNumber(id, number);
  }

  @Patch('companies/:id/package')
  assignPackage(@Param('id') id: string, @Body('packageName') packageName: string) {
    return this.superAdminService.assignPackage(id, packageName);
  }

  @Patch('companies/:id/agent-limit')
  updateAgentLimit(@Param('id') id: string, @Body('agentLimit') agentLimit: number) {
    return this.superAdminService.updateAgentLimit(id, Number(agentLimit));
  }

  @Patch('companies/:id/features')
  updateFeatures(@Param('id') id: string, @Body() body: {
    canOutboundCall?: boolean;
    canInboundCall?: boolean;
    canSendSms?: boolean;
    canRecord?: boolean;
  }) {
    return this.superAdminService.updateFeatures(id, body);
  }

  @Get('companies/:id/package-usage')
  getPackageUsage(@Param('id') id: string) {
    return this.superAdminService.getPackageUsage(id);
  }

  @Get('packages')
  getPackages() {
    return SuperAdminService.PACKAGES;
  }

  @Get('billing-summary')
  getBillingSummary() {
    return this.superAdminService.getBillingSummary();
  }

  @Get('analytics')
  getAnalytics() {
    return this.superAdminService.getAnalytics();
  }

  @Get('analytics/:id')
  getCompanyAnalytics(@Param('id') id: string) {
    return this.superAdminService.getCompanyAnalytics(id);
  }

  @Get('recordings')
  getRecordings(
    @Query('accountId') accountId?: string,
    @Query('search') search?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    return this.superAdminService.getRecordings({
      accountId,
      search,
      from,
      to,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('companies/:id/recordings')
  getCompanyRecordings(
    @Param('id') id: string,
    @Query('search') search?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    return this.superAdminService.getRecordings({
      accountId: id,
      search,
      from,
      to,
      limit: limit ? Number(limit) : undefined,
    });
  }
}
