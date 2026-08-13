import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto, RefreshTokenDto } from './dto/auth-response.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Public } from '../common/decorators/auth.decorators';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { IsNotEmpty, IsString } from 'class-validator';
import { AuthRateLimit, AuthRateLimitGuard } from './auth-rate-limit.guard';

class RefreshBodyDto implements RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @UseGuards(AuthRateLimitGuard)
  @AuthRateLimit('login')
  @Post('login')
  @ApiOperation({ summary: 'Login with email and password' })
  async login(@Body() dto: LoginDto, @Req() req: Request): Promise<LoginResponseDto> {
    return this.authService.login(dto, req.ip, req.headers['user-agent']);
  }

  @Public()
  @UseGuards(AuthRateLimitGuard)
  @AuthRateLimit('refresh')
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(@Body() body: RefreshBodyDto): Promise<LoginResponseDto['tokens']> {
    return this.authService.refresh(body.refreshToken);
  }

  @ApiBearerAuth()
  @Post('logout')
  @ApiOperation({ summary: 'Logout and revoke refresh tokens' })
  async logout(@CurrentUser() user: JwtPayload, @Req() req: Request): Promise<{ message: string }> {
    await this.authService.logout(user.sub, user.companyId, req.ip);
    return { message: 'Logged out successfully.' };
  }

  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  async me(@CurrentUser() user: JwtPayload): Promise<LoginResponseDto['user']> {
    return this.authService.getProfile(user.sub);
  }

  @ApiBearerAuth()
  @Post('change-password')
  @ApiOperation({ summary: 'Change password for the authenticated user' })
  async changePassword(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ChangePasswordDto,
    @Req() req: Request,
  ): Promise<{ message: string }> {
    return this.authService.changePassword(user.sub, user.companyId, dto, req.ip, req.headers['user-agent']);
  }
}
