import { Body, Controller, Get, Param, Patch, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { SettingsService } from './settings.service';
import { SettingsServiceRateDto } from './dto/service-rate-response.dto';
import { UpdateServiceRateDto } from './dto/update-service-rate.dto';
import { RequirePermissions } from '../common/decorators/auth.decorators';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('Settings')
@ApiBearerAuth()
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('service-rates')
  @RequirePermissions('settings.read')
  @ApiOperation({ summary: 'List all studio service rates' })
  async getServiceRates(
    @CurrentUser() user: JwtPayload,
  ): Promise<SettingsServiceRateDto[]> {
    return this.settingsService.getServiceRates(user.companyId);
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
