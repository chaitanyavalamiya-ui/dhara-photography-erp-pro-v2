import { apiClient, ApiResponse } from '@/services/api-client';

export interface RoboChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface RoboChatResult {
  reply: string;
  language: 'gu' | 'hi' | 'en';
  state: string;
  guideId?: string;
  provider: string;
  toolsUsed: string[];
}

export const roboService = {
  async chat(messages: RoboChatMessage[]): Promise<RoboChatResult> {
    const { data } = await apiClient.post<ApiResponse<RoboChatResult>>('/robo/chat', {
      messages: messages.slice(-8),
    });
    return data.data;
  },
};
