// فایل کامل: mani-agah-esmaeilzad/test/src/lib/ai-conversations.ts

// این کلاس دیگر جلسات را در حافظه نگه نمی‌دارد و فقط برای تبدیل فرمت تاریخچه استفاده می‌شود.

type MessageRole = 'user' | 'model';

// این اینترفیس برای هماهنگی با ai-gemini.ts استفاده می‌شود
export interface HistoryMessage {
  role: MessageRole;
  parts: { text: string }[];
}

export class ConversationManager {
  /**
   * این تابع تاریخچه پیام‌های ذخیره شده در دیتابیس را به فرمت مورد نیاز Gemini تبدیل می‌کند.
   * @param dbMessages - آرایه‌ای از پیام‌ها که از جدول chat_messages خوانده شده.
   * @returns آرایه‌ای با فرمت مناسب برای ارسال به Gemini.
   */
  static formatHistoryForGemini(dbMessages: any[]): HistoryMessage[] {
    if (!dbMessages || dbMessages.length === 0) {
      return [];
    }
    
    return dbMessages.map(msg => ({
      role: msg.message_type === 'ai' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));
  }
}