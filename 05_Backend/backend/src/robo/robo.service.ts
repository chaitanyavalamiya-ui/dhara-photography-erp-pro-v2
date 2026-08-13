import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { RoboChatRequestDto, RoboChatResponseDto } from './dto/robo-chat.dto';
import { RoboToolsService } from './robo-tools.service';
import { AiProviderFactory } from './ai/ai-provider.factory';
import { detectRoboLanguage } from './utils/robo-language';
import { detectRoboDatePreset, parseIsoDateFromText, resolveRoboDateRange } from './utils/robo-dates';
import { isRoboToolName, RoboToolName } from './robo-tools.catalog';

const MAX_MESSAGES = 8;

@Injectable()
export class RoboService {
  constructor(
    private readonly tools: RoboToolsService,
    private readonly providers: AiProviderFactory,
  ) {}

  async chat(user: JwtPayload, dto: RoboChatRequestDto): Promise<RoboChatResponseDto> {
    const messages = (dto.messages ?? []).slice(-MAX_MESSAGES);
    const lastUser = [...messages].reverse().find((message) => message.role === 'user');
    if (!lastUser?.content?.trim()) {
      throw new BadRequestException('A user message is required.');
    }

    const language = detectRoboLanguage(lastUser.content);
    const guideId = this.detectGuide(lastUser.content);
    const toolsToRun = this.selectTools(lastUser.content, dto.requestedTool, messages);
    const toolResults: { name: string; result: unknown }[] = [];

    try {
      for (const call of toolsToRun) {
        const result = await this.tools.execute(user, call);
        toolResults.push({ name: call.name, result });
      }

      const provider = this.providers.get();
      const ai = await provider.chat({
        language,
        messages,
        toolResults,
        guideHint: guideId,
      });

      return {
        reply: ai.reply,
        language,
        state: guideId ? 'guiding' : toolResults.length ? 'talking' : 'thinking',
        guideId,
        provider: ai.provider,
        toolsUsed: toolResults.map((item) => item.name),
      };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new ServiceUnavailableException(
        error instanceof Error ? error.message : 'AI provider unavailable.',
      );
    }
  }

  private detectGuide(text: string): string | undefined {
    const value = text.toLowerCase();
    if (/client.*(add|create|બનાવ|जोड़|नया)|ક્લાયન્ટ.*કેવી/.test(value)) return 'add-client';
    if (/booking.*(add|create|બનાવ|जोड़)|બુકિંગ.*કેવી/.test(value)) return 'add-booking';
    if (/invoice.*(add|create|generate|બનાવ)|ઇન્વોઇસ/.test(value) && /કેવી|कैसे|how/.test(value)) {
      return 'create-invoice';
    }
    if (/backup|બેકઅપ|बैकअप/.test(value) && /કેવી|कैसे|how/.test(value)) return 'backup';
    return undefined;
  }

  private selectTools(
    text: string,
    requestedTool: string | undefined,
    messages: { role: string; content: string }[],
  ): { name: RoboToolName; args?: Record<string, unknown> }[] {
    if (requestedTool) {
      if (!isRoboToolName(requestedTool)) {
        throw new BadRequestException(`Invalid Robo tool: ${requestedTool}`);
      }
      return [{ name: requestedTool }];
    }

    const value = text.toLowerCase();
    const combined = `${messages.map((message) => message.content).join(' ')}\n${text}`;
    const iso = parseIsoDateFromText(text);
    const preset = detectRoboDatePreset(text) ?? (this.isFollowUp(value) ? detectRoboDatePreset(combined) : null);

    if (/client|ક્લાયન્ટ|ग्राहक/.test(value) && /search|શોધ|ढूंढ|find|નામ/.test(value)) {
      return [{ name: 'search_clients', args: { search: text } }];
    }
    if (/birthday|anniversary|જન્મદિવસ|લગ્ન દિવસ|जन्मदिन/.test(value)) {
      return [{ name: 'get_upcoming_events' }];
    }
    if (/invoice|બિલ|इनवॉइस/.test(value)) {
      return [{ name: 'list_invoices' }];
    }
    if (/gallery|ગેલેરી|गैलरी|photo/.test(value)) {
      return [{ name: 'list_galleries' }];
    }
    if (/album|આલ્બમ|एल्बम/.test(value)) {
      return [{ name: 'list_albums' }];
    }
    if (/outstanding|profit|expense|payment|રકમ|નફો|खर्च|बकाया/.test(value) && /report|report|એકાઉન્ટ|account/.test(value)) {
      return [{ name: 'get_reports_dashboard', args: { preset: 'this_month' } }];
    }
    if (/outstanding|profit|received|expense|નફો|આવક|खर्च/.test(value)) {
      return [{ name: 'get_accounts_dashboard' }, { name: 'get_period_summary', args: { preset: 'this_month' } }];
    }
    if (/booking|બુકિંગ|बुकिंग/.test(value) || preset || iso) {
      if (iso) {
        return [{ name: 'get_bookings_for_range', args: { dateFrom: iso, dateTo: iso } }];
      }
      const range = resolveRoboDateRange(preset ?? 'today');
      if ((preset ?? 'today') === 'today') {
        return [{ name: 'get_today_bookings' }];
      }
      return [{ name: 'get_bookings_for_range', args: range }];
    }

    return [];
  }

  private isFollowUp(text: string): boolean {
    return /એમાંથી|उसमें|among them|wedding|those/.test(text);
  }
}
