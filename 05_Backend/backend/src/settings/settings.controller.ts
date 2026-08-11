import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { SettingsService } from './settings.service';
import { CreateMasterDataDto } from './dto/create-master-data.dto';
import { CompanyProfileDto, UpdateCompanyProfileDto } from './dto/company-profile.dto';
import { ListMasterDataQueryDto } from './dto/list-master-data-query.dto';
import { MasterDataItemDto } from './dto/master-data-response.dto';
import { CreatePackageDto, PackageResponseDto, UpdatePackageDto } from './dto/package.dto';
import { SettingsServiceRateDto } from './dto/service-rate-response.dto';
import { UpdateMasterDataDto } from './dto/update-master-data.dto';
import { UpdateServiceRateDto } from './dto/update-service-rate.dto';
import { RequirePermissions } from '../common/decorators/auth.decorators';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('Settings')
@ApiBearerAuth()
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('company')
  @RequirePermissions('settings.read')
  @ApiOperation({ summary: 'Get studio company profile' })
  async getCompanyProfile(@CurrentUser() user: JwtPayload): Promise<CompanyProfileDto> {
    return this.settingsService.getCompanyProfile(user.companyId);
  }

  @Patch('company')
  @RequirePermissions('settings.update')
  @ApiOperation({ summary: 'Update studio company profile' })
  async updateCompanyProfile(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateCompanyProfileDto,
    @Req() req: Request,
  ): Promise<CompanyProfileDto> {
    return this.settingsService.updateCompanyProfile(
      user.companyId,
      user.sub,
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Get('packages')
  @ApiOperation({ summary: 'List studio packages' })
  async getPackages(
    @CurrentUser() user: JwtPayload,
    @Query('includeInactive') includeInactive?: string,
  ): Promise<PackageResponseDto[]> {
    return this.settingsService.getPackages(
      user.companyId,
      includeInactive === 'true',
    );
  }

  @Post('packages')
  @RequirePermissions('settings.update')
  @ApiOperation({ summary: 'Create a studio package' })
  async createPackage(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreatePackageDto,
    @Req() req: Request,
  ): Promise<PackageResponseDto> {
    return this.settingsService.createPackage(
      user.companyId,
      user.sub,
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Patch('packages/:id')
  @RequirePermissions('settings.update')
  @ApiOperation({ summary: 'Update a studio package' })
  async updatePackage(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdatePackageDto,
    @Req() req: Request,
  ): Promise<PackageResponseDto> {
    return this.settingsService.updatePackage(
      user.companyId,
      user.sub,
      id,
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Get('service-rates')
  @RequirePermissions('settings.read')
  @ApiOperation({ summary: 'List all studio service rates' })
  async getServiceRates(
    @CurrentUser() user: JwtPayload,
  ): Promise<SettingsServiceRateDto[]> {
    return this.settingsService.getServiceRates(user.companyId);
  }

  @Get('master-data')
  @ApiOperation({ summary: 'List master data items for a category' })
  async getMasterData(
    @CurrentUser() user: JwtPayload,
    @Query() query: ListMasterDataQueryDto,
  ): Promise<MasterDataItemDto[]> {
    return this.settingsService.getMasterData(
      user.companyId,
      query.category,
      query.includeInactive,
    );
  }

  @Post('master-data')
  @RequirePermissions('settings.update')
  @ApiOperation({ summary: 'Create a master data item' })
  async createMasterData(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateMasterDataDto,
    @Req() req: Request,
  ): Promise<MasterDataItemDto> {
    return this.settingsService.createMasterData(
      user.companyId,
      user.sub,
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Patch('master-data/:id')
  @RequirePermissions('settings.update')
  @ApiOperation({ summary: 'Update a master data item' })
  async updateMasterData(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateMasterDataDto,
    @Req() req: Request,
  ): Promise<MasterDataItemDto> {
    return this.settingsService.updateMasterData(
      user.companyId,
      user.sub,
      id,
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Patch('service-rates/:id')
  @RequirePermissions('settings.update')
  @ApiOperation({ summary: 'Update a service rate' })
  async updateServiceRate(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateServiceRateDto,
    @Req() req: Request,
  ): Promise<SettingsServiceRateDto> {
    return this.settingsService.updateServiceRate(
      user.companyId,
      user.sub,
      id,
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }
}
