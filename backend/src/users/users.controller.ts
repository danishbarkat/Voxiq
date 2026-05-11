import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
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
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Roles('Admin', 'Manager')
  @Get()
  findAll(@Req() req: any) {
    return this.usersService.findAll(req?.user);
  }

  @Roles('Admin')
  @Get('roles')
  findAllRoles() {
    return this.usersService.findAllRoles();
  }

  @Roles('Admin', 'Manager', 'Agent')
  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.usersService.findOne(id);
  }

  @Roles('Admin')
  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(id, dto);
  }

  /** Assign SIP credentials (Telnyx WebRTC login) to an agent */
  @Roles('Admin', 'Manager')
  @Patch(':id/sip-credentials')
  updateSipCredentials(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: { sipUri?: string; sipPassword?: string },
  ) {
    return this.usersService.update(id, body as any);
  }

  /** Assign a Telnyx caller number to an agent */
  @Roles('Admin', 'Manager')
  @Patch(':id/caller-number')
  updateCallerNumber(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body('callerNumber') callerNumber: string | null,
  ) {
    return this.usersService.updateCallerNumber(id, callerNumber);
  }

  /** Replace an agent's assigned lists */
  @Roles('Admin', 'Manager')
  @Put(':id/lists')
  updateAgentLists(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body('listIds') listIds: string[],
  ) {
    return this.usersService.updateAgentLists(id, listIds ?? []);
  }

  @Roles('Admin')
  @Delete(':id')
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.usersService.remove(id);
  }
}
