import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto/create-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import {
  PaginatedUsersResponseDto,
  RoleOptionDto,
  UserDetailResponseDto,
  UserResponseDto,
} from './dto/user-response.dto';
import { RequirePermissions } from '../common/decorators/auth.decorators';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermissions('users.read')
  @ApiOperation({ summary: 'List users with search and filters' })
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: ListUsersQueryDto,
  ): Promise<PaginatedUsersResponseDto> {
    return this.usersService.findAll(user.companyId, query);
  }

  @Get('roles')
  @RequirePermissions('users.read')
  @ApiOperation({ summary: 'List assignable roles' })
  async getRoles(@CurrentUser() user: JwtPayload): Promise<RoleOptionDto[]> {
    return this.usersService.getRoles(user.companyId);
  }

  @Get(':id')
  @RequirePermissions('users.read')
  @ApiOperation({ summary: 'Get user details' })
  async findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<UserDetailResponseDto> {
    return this.usersService.findOne(user.companyId, id);
  }

  @Post()
  @RequirePermissions('users.manage')
  @ApiOperation({ summary: 'Create a new user' })
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateUserDto,
    @Req() req: Request,
  ): Promise<UserResponseDto> {
    return this.usersService.create(
      user.companyId,
      user.sub,
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Patch(':id')
  @RequirePermissions('users.manage')
  @ApiOperation({ summary: 'Update an existing user' })
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @Req() req: Request,
  ): Promise<UserResponseDto> {
    return this.usersService.update(
      user.companyId,
      user.sub,
      id,
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Post(':id/unlock')
  @RequirePermissions('users.manage')
  @ApiOperation({ summary: 'Unlock a locked user account' })
  async unlock(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<UserResponseDto> {
    return this.usersService.unlock(
      user.companyId,
      user.sub,
      id,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Delete(':id')
  @RequirePermissions('users.manage')
  @ApiOperation({ summary: 'Archive a user' })
  async archive(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<{ message: string }> {
    return this.usersService.archive(
      user.companyId,
      user.sub,
      id,
      req.ip,
      req.headers['user-agent'],
    );
  }
}
