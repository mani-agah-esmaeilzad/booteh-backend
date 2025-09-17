// فایل کامل: src/lib/ai-conversations.ts
import { ChatMessage as GeminiChatMessage } from './ai-gemini'; // این ایمپورت ممکن است دیگر لازم نباشد
import { ChatMessage as OpenAIChatMessage } from './ai';

export class ConversationManager {
  // ... (توابع قبلی ممکن است هنوز در جایی استفاده شوند، پس آن‌ها را نگه می‌داریم)

  static formatHistoryForGemini(dbHistory: any[]): GeminiChatMessage[] {
    return dbHistory
      .filter(msg => msg.message_type === 'user' || msg.message_type === 'ai')
      .map(msg => ({
        role: msg.message_type === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      }));
  }

  // تابع جدید برای فرمت کردن تاریخچه برای OpenAI و AvalAI
  static formatHistoryForOpenAI(dbHistory: any[]): OpenAIChatMessage[] {
    return dbHistory
      .filter(msg => msg.message_type === 'user' || msg.message_type === 'ai')
      .map(msg => ({
        role: msg.message_type === 'user' ? 'user' : 'assistant', // نقش 'model' به 'assistant' تغییر می‌کند
        content: msg.content,
      }));
  }
}
