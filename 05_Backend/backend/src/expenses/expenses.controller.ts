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
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { CreateStaffPaymentDto } from './dto/create-staff-payment.dto';
import { UpdateStaffPaymentDto } from './dto/update-staff-payment.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ListExpensesQueryDto } from './dto/list-expenses-query.dto';
import {
  ExpenseResponseDto,
  PaginatedExpensesResponseDto,
} from './dto/expense-response.dto';
import { RequirePermissions } from '../common/decorators/auth.decorators';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('Expenses')
@ApiBearerAuth()
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Get()
  @RequirePermissions('expenses.read')
  @ApiOperation({ summary: 'List expenses with search and filters' })
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: ListExpensesQueryDto,
  ): Promise<PaginatedExpensesResponseDto> {
    return this.expensesService.findAll(user.companyId, query);
  }

  @Get(':id')
  @RequirePermissions('expenses.read')
  @ApiOperation({ summary: 'Get expense details' })
  async findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<ExpenseResponseDto> {
    return this.expensesService.findOne(user.companyId, id);
  }

  @Post()
  @RequirePermissions('expenses.create')
  @ApiOperation({ summary: 'Record a new expense' })
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateExpenseDto,
    @Req() req: Request,
  ): Promise<ExpenseResponseDto> {
    return this.expensesService.create(
      user.companyId,
      user.sub,
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Post('staff-payments')
  @RequirePermissions('expenses.create')
  @ApiOperation({ summary: 'Record a staff payment as a single expense ledger entry' })
  async createStaffPayment(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateStaffPaymentDto,
    @Req() req: Request,
  ): Promise<ExpenseResponseDto> {
    return this.expensesService.createStaffPayment(
      user.companyId,
      user.sub,
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Patch('staff-payments/:id')
  @RequirePermissions('expenses.update')
  @ApiOperation({ summary: 'Update a staff payment expense' })
  async updateStaffPayment(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateStaffPaymentDto,
    @Req() req: Request,
  ): Promise<ExpenseResponseDto> {
    return this.expensesService.updateStaffPayment(
      user.companyId,
      user.sub,
      id,
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Patch(':id')
  @RequirePermissions('expenses.update')
  @ApiOperation({ summary: 'Update an expense' })
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateExpenseDto,
    @Req() req: Request,
  ): Promise<ExpenseResponseDto> {
    return this.expensesService.update(
      user.companyId,
      user.sub,
      id,
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Delete(':id')
  @RequirePermissions('expenses.update')
  @ApiOperation({ summary: 'Archive an expense' })
  async archive(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<{ message: string }> {
    return this.expensesService.archive(
      user.companyId,
      user.sub,
      id,
      req.ip,
      req.headers['user-agent'],
    );
  }
}
