import { Injectable } from '@nestjs/common';
import { AiChatInput, AiChatOutput, AiProvider } from './ai-provider.interface';

@Injectable()
export class LocalErpAiProvider implements AiProvider {
  readonly name = 'local-erp';

  isConfigured(): boolean {
    return true;
  }

  async chat(input: AiChatInput): Promise<AiChatOutput> {
    const lastUser = [...input.messages].reverse().find((message) => message.role === 'user');
    const language = input.language;
    const tools = input.toolResults;

    if (input.guideHint) {
      return {
        provider: this.name,
        reply: this.guideReply(language, input.guideHint),
      };
    }

    if (!tools.length) {
      return {
        provider: this.name,
        reply: this.fallback(language, lastUser?.content ?? ''),
      };
    }

    const summary = tools
      .map((tool) => `${tool.name}: ${this.summarize(tool.result)}`)
      .join('\n');

    if (language === 'gu') {
      return { provider: this.name, reply: `ERP માહિતી:\n${summary}` };
    }
    if (language === 'hi') {
      return { provider: this.name, reply: `ERP जानकारी:\n${summary}` };
    }
    return { provider: this.name, reply: `ERP information:\n${summary}` };
  }

  private guideReply(language: AiChatInput['language'], guideId: string): string {
    if (language === 'gu') return `હું બતાવું છું. (${guideId})`;
    if (language === 'hi') return `मैं दिखाता हूँ. (${guideId})`;
    return `I will show you. (${guideId})`;
  }

  private fallback(language: AiChatInput['language'], question: string): string {
    if (language === 'gu') {
      return `હું તમારા પ્રશ્નને સમજી ગયો: "${question}". વધુ વિગત માટે Clients, Bookings અથવા Reports જુઓ.`;
    }
    if (language === 'hi') {
      return `मैं आपका प्रश्न समझ गया: "${question}". अधिक जानकारी के लिए Clients, Bookings या Reports देखें.`;
    }
    return `I understood: "${question}". Check Clients, Bookings, or Reports for details.`;
  }

  private summarize(result: unknown): string {
    if (Array.isArray(result)) {
      return `${result.length} item(s)`;
    }
    if (result && typeof result === 'object') {
      const record = result as Record<string, unknown>;
      if (typeof record.total === 'number') return `total ${record.total}`;
      if (Array.isArray(record.items)) return `${record.items.length} item(s)`;
      const keys = Object.keys(record).slice(0, 6);
      return keys
        .map((key) => `${key}=${typeof record[key] === 'object' ? '[object]' : String(record[key])}`)
        .join(', ');
    }
    return String(result);
  }
}
