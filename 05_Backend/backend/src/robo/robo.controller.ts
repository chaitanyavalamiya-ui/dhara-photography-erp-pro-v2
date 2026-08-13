import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { RoboService } from './robo.service';
import { RoboChatRequestDto, RoboChatResponseDto } from './dto/robo-chat.dto';

@ApiTags('Robo')
@ApiBearerAuth()
@Controller('robo')
export class RoboController {
  constructor(private readonly roboService: RoboService) {}

  @Post('chat')
  @ApiOperation({ summary: 'Ask Robo a read-only ERP question' })
  async chat(
    @CurrentUser() user: JwtPayload,
    @Body() dto: RoboChatRequestDto,
  ): Promise<RoboChatResponseDto> {
    return this.roboService.chat(user, dto);
  }
}
