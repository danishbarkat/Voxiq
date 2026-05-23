import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { SuperAdminService } from './superadmin.service';

class ApproveDto {
  agentLimit: number;
  numberPool: Array<{ number: string; callerName: string; areaCode: string }>;
}

class RejectDto {
  reason: string;
}

@Controller('superadmin')
@Roles('SuperAdmin')
export class SuperAdminController {
  constructor(private readonly superAdminService: SuperAdminService) {}

  @Get('companies')
  getAllCompanies() {
    return this.superAdminService.getAllCompanies();
  }

  @Post('companies/:id/approve')
  approveCompany(@Param('id') id: string, @Body() dto: ApproveDto) {
    return this.superAdminService.approveCompany(id, dto.agentLimit, dto.numberPool);
  }

  @Post('companies/:id/reject')
  rejectCompany(@Param('id') id: string, @Body() dto: RejectDto) {
    return this.superAdminService.rejectCompany(id, dto.reason);
  }

  @Post('companies/:id/deactivate')
  deactivateCompany(@Param('id') id: string) {
    return this.superAdminService.deactivateCompany(id);
  }

  @Post('companies/:id/activate')
  activateCompany(@Param('id') id: string) {
    return this.superAdminService.activateCompany(id);
  }

  @Get('analytics')
  getAnalytics() {
    return this.superAdminService.getAnalytics();
  }

  @Get('analytics/:id')
  getCompanyAnalytics(@Param('id') id: string) {
    return this.superAdminService.getCompanyAnalytics(id);
  }
}
