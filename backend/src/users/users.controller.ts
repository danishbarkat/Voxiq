import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Roles('Admin')
  @Post()
  create(@Body() dto: CreateUserDto, @Req() req: any) {
    return this.usersService.create(dto, req?.user);
  }

  @Roles('Admin', 'Manager')
  @Get()
  findAll(@Req() req: any) {
    return this.usersService.findAll(req?.user);
  }

  @Roles('Admin')
  @Get('roles')
  findAllRoles(@Req() req: any) {
    return this.usersService.findAllRoles(req?.user);
  }

  @Roles('Admin', 'Manager')
  @Get('company-number-inventory')
  getCompanyNumberInventory(@Req() req: any) {
    return this.usersService.getCompanyNumberInventory(req?.user);
  }

  @Roles('Admin', 'Manager', 'Agent')
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.usersService.findOne(id, req?.user);
  }

  @Roles('Admin')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @Req() req: any,
  ) {
    return this.usersService.update(id, dto, req?.user);
  }

  /** Assign SIP credentials (Telnyx WebRTC login) to an agent */
  @Roles('Admin', 'Manager')
  @Patch(':id/sip-credentials')
  updateSipCredentials(
    @Param('id') id: string,
    @Body() body: { sipUri?: string; sipPassword?: string },
    @Req() req: any,
  ) {
    return this.usersService.update(id, body as any, req?.user);
  }

  /** Assign a Telnyx caller number to an agent */
  @Roles('Admin', 'Manager')
  @Patch(':id/caller-number')
  updateCallerNumber(
    @Param('id') id: string,
    @Body('callerNumber') callerNumber: string | null,
    @Req() req: any,
  ) {
    return this.usersService.updateCallerNumber(id, callerNumber, req?.user);
  }

  /** Replace an agent's assigned lists */
  @Roles('Admin', 'Manager')
  @Put(':id/lists')
  updateAgentLists(
    @Param('id') id: string,
    @Body('listIds') listIds: string[],
    @Req() req: any,
  ) {
    return this.usersService.updateAgentLists(id, listIds ?? [], req?.user);
  }

  @Roles('Admin')
  @Post(':id/admin-reset-password')
  adminResetPassword(
    @Param('id') id: string,
    @Body('newPassword') newPassword: string,
    @Req() req: any,
  ) {
    return this.usersService.adminResetPassword(id, newPassword, req?.user);
  }

  @Roles('Admin')
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.usersService.remove(id, req?.user);
  }
}
