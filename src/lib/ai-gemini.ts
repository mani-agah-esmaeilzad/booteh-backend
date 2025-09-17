// src/lib/ai-gemini.ts
// این فایل برای ارتباط با سرویس AvalAI بازنویسی و خطای تایپ آن برطرف شده است

// کلید API و آدرس سرویس از متغیرهای محیطی خوانده می‌شود
const AVALAI_API_KEY = process.env.AVALAI_API_KEY || '';
const AVALAI_API_URL = "https://api.avalai.ir/v1/chat/completions";

// نام مدلی که AvalAI استفاده می‌کند.
const MODEL_NAME = process.env.AVALAI_MODEL_NAME || "gpt-4o";

if (!AVALAI_API_KEY) {
  throw new Error("AVALAI_API_KEY environment variable not set.");
}

// اینترفیس برای پیام‌های ورودی از دیتابیس (فرمت قبلی)
export interface ChatMessage {
  role: "user" | "model";
  parts: { text: string }[];
}

// اینترفیس برای پیام‌ها با فرمت AvalAI/OpenAI
interface AvalAIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// تابع کمکی برای ایجاد تاخیر جهت تلاش مجدد
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

/**
 * تابع اصلی برای تولید پاسخ از سرویس AvalAI
 * @param systemInstruction دستورالعمل سیستمی برای تعیین شخصیت AI
 * @param history تاریخچه گفتگو
 * @param retries تعداد تلاش مجدد در صورت خطا
 * @returns پاسخ متنی از AI
 */
export const generateResponse = async (
  systemInstruction: string,
  history: ChatMessage[],
  retries = 3
): Promise<string | null> => {
  if (history.length === 0) {
    console.error("Generate response called with empty history.");
    return "مشکلی در بازیابی تاریخچه مکالمه پیش آمده است.";
  }

  // تبدیل تاریخچه به فرمت مورد نیاز AvalAI
  const messages: AvalAIMessage[] = [
    { role: 'system', content: systemInstruction },
    // ✅ رفع خطا: با اضافه کردن as ('assistant' | 'user') مشکل تایپ برطرف می‌شود
    ...history.map(msg => ({
      role: (msg.role === 'model' ? 'assistant' : 'user') as ('assistant' | 'user'),
      content: msg.parts.map(p => p.text).join('\n')
    }))
  ];

  const body = JSON.stringify({
    model: MODEL_NAME,
    messages: messages,
    temperature: 0.9,
    top_p: 1,
    max_tokens: 2048,
  });

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(AVALAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AVALAI_API_KEY}`,
        },
        body: body,
      });

      if (!response.ok) {
        if ((response.status === 429 || response.status >= 500) && attempt < retries) {
          console.warn(`Attempt ${attempt} failed with status ${response.status}. Retrying in ${attempt * 2}s...`);
          await delay(attempt * 2000);
          continue;
        }
        const errorBody = await response.text();
        throw new Error(`API error: ${response.status} ${response.statusText} - ${errorBody}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || "پاسخ معتبری از سرویس دریافت نشد.";

    } catch (error: any) {
      console.error(`Attempt ${attempt} failed:`, error.message);
      if (attempt >= retries) {
        return "متاسفانه در حال حاضر قادر به پاسخگویی نیستم. لطفاً لحظاتی دیگر دوباره تلاش کنید.";
      }
    }
  }
  return "پس از چندین تلاش، مدل پاسخی نداد. لطفاً بعداً امتحان کنید.";
};


/**
 * تابع برای تولید هوشمند سوالات تکمیلی با AvalAI
 * @param conversationJson تاریخچه گفتگو به صورت JSON
 * @param personaPrompt پرامپت شخصیت AI
 * @returns دو سوال تکمیلی
 */
export const generateSupplementaryQuestions = async (conversationJson: string, personaPrompt: string): Promise<{ q1: string, q2: string }> => {
  const prompt = `
    You are an expert HR interviewer. Your task is to generate two insightful follow-up questions in Persian based on the provided conversation history and the original persona prompt. The questions should probe deeper into areas where the user was vague, or challenge them on a key competency related to the persona.
    
    **Output ONLY a valid JSON object with two keys: "question1" and "question2". Do not add any other text.**

    **Original Persona Prompt:**
    ${personaPrompt}

    **Conversation History (JSON):**
    ${conversationJson}
  `;

  try {
    const response = await fetch(AVALAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AVALAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);
    
    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    const parsed = JSON.parse(content);

    return {
      q1: parsed.question1 || "سوال اول ایجاد نشد.",
      q2: parsed.question2 || "سوال دوم ایجاد نشد."
    };
  } catch (error) {
    console.error("Error generating supplementary questions:", error);
    return {
      q1: "بر اساس مکالمه‌ای که داشتیم، بزرگترین نقطه قوت شما که در این سناریو به نمایش گذاشته شد چه بود؟",
      q2: "با توجه به چالش مطرح شده، فکر می‌کنید در کدام بخش نیاز به بهبود و یادگیری بیشتری دارید؟"
    };
  }
};


/**
 * تابع برای تحلیل نهایی مکالمه با AvalAI
 * @param conversationJson تاریخچه گفتگو به صورت JSON
 * @param analysisPrompt پرامپت تحلیل
 * @returns گزارش تحلیل
 */
export const analyzeConversation = async (conversationJson: string, analysisPrompt: string): Promise<string> => {
  const prompt = `
    ${analysisPrompt}
    
    This is the conversation history in JSON format. Analyze it based on the instructions above.
    Conversation:
    ${conversationJson}
    
    Begin Analysis (in Persian):
  `;

  try {
    const response = await fetch(AVALAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AVALAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);
    
    const data = await response.json();
    return data.choices[0]?.message?.content || "تحلیل مکالمه با خطا مواجه شد.";

  } catch (error) {
    console.error("Error analyzing conversation:", error);
    return "{\"error\": \"تحلیل مکالمه با خطا مواجه شد.\"}";
  }
};
