import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, GenerationConfig, ChatSession, Content } from "@google/generative-ai";

const API_KEY = process.env.GEMINI_API_KEY || '';
const MODEL_NAME = "gemini-1.5-flash-latest";

if (!API_KEY) {
  throw new Error("GEMINI_API_KEY environment variable not set.");
}

const genAI = new GoogleGenerativeAI(API_KEY);

const generationConfig: GenerationConfig = {
  temperature: 0.9,
  topK: 1,
  topP: 1,
  maxOutputTokens: 2048,
};

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

export interface ChatMessage {
  role: "user" | "model";
  parts: { text: string }[];
}

// تابع کمکی برای ایجاد تاخیر
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export const generateResponse = async (
  systemInstruction: string,
  history: ChatMessage[],
  retries = 3 // تعداد تلاش مجدد
): Promise<string | null> => {
  if (history.length === 0) {
    console.error("Generate response called with empty history.");
    return "مشکلی در بازیابی تاریخچه مکالمه پیش آمده است. لطفاً دوباره تلاش کنید.";
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      let historyForChat = history.slice(0, -1);

      // اگر تاریخچه با پیام 'model' شروع می‌شود، آن را نادیده می‌گیریم.
      if (historyForChat.length > 0 && historyForChat[0].role === 'model') {
        historyForChat = historyForChat.slice(1);
      }
      
      // اطمینان از اینکه تاریخچه حتما با پیام user شروع می‌شود
      if (historyForChat.length > 0 && historyForChat[0].role !== 'user') {
          historyForChat = [];
      }

      const chat: ChatSession = genAI.getGenerativeModel({ 
        model: MODEL_NAME,
        systemInstruction: systemInstruction,
      }).startChat({
        generationConfig,
        safetySettings,
        history: historyForChat as Content[],
      });

      const lastMessage = history[history.length - 1].parts.map(p => p.text).join('\n');
      
      const result = await chat.sendMessage(lastMessage);
      const response = result.response;
      return response.text(); // در صورت موفقیت، از حلقه خارج می‌شویم

    } catch (error: any) {
      console.error(`Attempt ${attempt} failed:`, error.message);
      // فقط برای خطاهای سمت سرور (مانند 503) تلاش مجدد می‌کنیم
      if (attempt < retries && (error.message?.includes('503') || error.message?.includes('overloaded'))) {
        console.log(`Model is overloaded. Retrying in ${attempt * 2} seconds...`);
        await delay(attempt * 2000); // تاخیر ۲، ۴، ۶ ثانیه
      } else {
        // برای خطاهای دیگر یا پس از آخرین تلاش، پیام خطا را برمی‌گردانیم
        return "متاسفانه در حال حاضر قادر به پاسخگویی نیستم. لطفاً لحظاتی دیگر دوباره تلاش کنید.";
      }
    }
  }
  return "پس از چندین تلاش، مدل پاسخی نداد. لطفاً بعداً امتحان کنید.";
};

// تابع برای تولید هوشمند سوالات تکمیلی
export const generateSupplementaryQuestions = async (conversationJson: string, personaPrompt: string): Promise<{ q1: string, q2: string }> => {
  try {
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    const prompt = `
      You are an expert HR interviewer. Your task is to generate two insightful follow-up questions in Persian based on the provided conversation history and the original persona prompt. The questions should probe deeper into areas where the user was vague, or challenge them on a key competency related to the persona.
      
      **Output ONLY a valid JSON object with two keys: "question1" and "question2". Do not add any other text.**

      **Original Persona Prompt:**
      ${personaPrompt}

      **Conversation History (JSON):**
      ${conversationJson}
    `;
    const result = await model.generateContent(prompt);
    const textResult = result.response.text();

    const jsonMatch = textResult.match(/\{[\s\S]*\}/);
    if (jsonMatch && jsonMatch[0]) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
            q1: parsed.question1 || "سوال اول ایجاد نشد.",
            q2: parsed.question2 || "سوال دوم ایجاد نشد."
        };
    } else {
        throw new Error("AI did not return valid JSON for supplementary questions.");
    }
  } catch (error) {
    console.error("Error generating supplementary questions:", error);
    // بازگرداندن سوالات عمومی در صورت بروز خطا
    return {
        q1: "بر اساس مکالمه‌ای که داشتیم، فکر می‌کنید بزرگترین نقطه قوت شما که در این سناریو به نمایش گذاشته شد چه بود؟",
        q2: "با توجه به چالش مطرح شده، فکر می‌کنید در کدام بخش نیاز به بهبود و یادگیری بیشتری دارید؟"
    };
  }
};

// تابع برای تحلیل نهایی مکالمه
export const analyzeConversation = async (conversationJson: string, analysisPrompt: string): Promise<string> => {
  try {
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    const prompt = `
      ${analysisPrompt}
      
      This is the conversation history in JSON format. Analyze it based on the instructions above.
      Conversation:
      ${conversationJson}
      
      Begin Analysis (in Persian):
    `;
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error("Error analyzing conversation:", error);
    return "تحلیل مکالمه با خطا مواجه شد.";
  }
};