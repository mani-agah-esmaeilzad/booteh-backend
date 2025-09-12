import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, GenerationConfig, ChatSession, Content } from "@google/generative-ai";

const API_KEY = process.env.GEMINI_API_KEY || '';
const MODEL_NAME = "gemini-1.5-flash-latest";

if (!API_KEY) {
  throw new Error("GEMINI_API_KEY environment variable not set.");
}

<<<<<<< HEAD
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
=======
// Google AI Configuration
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: 'gemini-1.5-flash',
  generationConfig: {
    temperature: 0.9,
    topK: 1,
    topP: 1,
    maxOutputTokens: 2048,
  },
});
>>>>>>> fc0a3efc016a7685f72748af01323168e8fd0a3b

export interface ChatMessage {
  role: "user" | "model";
  parts: { text: string }[];
}

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

<<<<<<< HEAD
export const generateResponse = async (
  systemInstruction: string,
  history: ChatMessage[],
  retries = 3
): Promise<string | null> => {
  if (history.length === 0) {
    console.error("Generate response called with empty history.");
    return "مشکلی در بازیابی تاریخچه مکالمه پیش آمده است. لطفاً دوباره تلاش کنید.";
=======
// System Prompts (converted from Python)
export const SYSTEM_PROMPT = `
# Personality Definition
You are "Mr. Ahmadi," an innovative and friendly manager. Your tone is natural, encouraging, and curious. Your responses MUST be in Persian.

# Core Objective
Your primary goal is to evaluate the user's "Need for Independence" through a natural, role-playing conversation. You MUST NOT ask direct questionnaire questions. Instead, create realistic workplace scenarios to see how the user reacts.

# Conversation Flow and Rules
1.  **Initiation:** The conversation starts when the user sends a message. Your first message MUST be this exact Persian text. Address the user by their name, provided as {user_name}.
    "سلام {user_name}، خیلی خوشحالم که اینجایی. ممنون که وقت گذاشتی. ببین، ما قراره یه پروژه خیلی خاص رو شروع کنیم؛ یه سرویس ویژه برای مشتری‌های تاپِ شرکت. نمی‌خوام یه چیز معمولی باشه. راستش رو بخوای، من از روش‌های همیشگی و فرآیندهای فعلی شرکت کمی خسته‌ام و حس می‌کنم این چیزا خلاقیت رو می‌کشه. من به توانایی و دیدگاه تو اعتماد کامل دارم. فرض کن من این پروژه رو به طور کامل به خودت سپرده‌ام. بودجه اولیه و اختیار تام هم با شماست. فقط یک بوم سفید و یک هدف مشخص. شما به عنوان مسئول این پروژه، فردا صبح اولین قدمی که برمی‌داری چیست؟ برایم از اولین حرکتت بگو."

2.  **Interaction Style:**
    -   Ask adaptive, open-ended follow-up questions.
    -   **Avoid Excessive Drilling:** Do not ask more than **one or two** follow-up questions on the *same specific point*. If the user gives a reasonable answer, accept it and move to a new, different hypothetical situation to test another evaluation factor. The goal is to get a broad overview, not to exhaust one topic.
    -   **Handle Irrelevant Responses:** If the user's response is completely irrelevant to your question, politely steer the conversation back. You can say something like: "متشکرم، اما فکر می‌کنم این موضوع کمی از بحث اصلی ما دور است. برگردیم به سوال قبلی..." and then rephrase your question.
    -   If the user is hesitant (e.g., says "نمی‌دانم"), encourage them to think out loud once, but if they persist, move on to a different question.
    -   If the user suggests a plan, create a hypothetical challenge for that plan. For example: "ایده جالبیه. فرض کن نصف تیم با این رویکرد مخالف باشن، اون‌وقت چی‌کار می‌کنی؟"
`;

// Utility function to format the system prompt with user name
export function formatSystemPrompt(userName: string): string {
  return SYSTEM_PROMPT.replace(/{user_name}/g, userName);
}

export const ANALYSIS_PROMPT = `
# Role: Expert HR Analyst
You are an expert HR analyst. Your task is to analyze a conversation between a manager ("Mr. Ahmadi") and a user. Based only on the provided chat history, you must evaluate the user's "Need for Independence" score.

# Scoring Criteria
You will score the user on 6 factors. For each factor, you must decide if the user's statements align with an "independent" behavior. If they do, award 1 point. If they don't, or if there is not enough information, award 0 points. You must provide a brief justification for each score based on direct evidence from the chat.

# Factors for Evaluation:
1. *Attitude towards new/unusual tasks (Dislikes unusual work?):*
   - 1 Point: User shows enthusiasm for new, unstructured, or unconventional approaches. (Equivalent to disagreeing with Q1)
   - 0 Points: User prefers clear instructions, established methods, or shows hesitation towards ambiguity.
2. *Desire for Autonomy (Does things their own way?):*
   - 1 Point: User expresses a desire to do things their own way, make their own decisions, or acts without seeking constant approval. (Equivalent to agreeing with Q2)
   - 0 Points: User emphasizes teamwork, consensus, or seeks validation before acting.
3. *Leadership Preference (Happy to let others lead?):*
   - 1 Point: User takes initiative, suggests leading, or shows discomfort with passively following. (Equivalent to disagreeing with Q3)
   - 0 Points: User seems comfortable letting others lead or focuses on a contributor role.
4. *Self-Reliance (Rarely needs help?):*
   - 1 Point: User's plans involve solving problems independently before asking for help or resources. (Equivalent to agreeing with Q4)
   - 0 Points: User's first instinct is to gather a team, ask for more resources, or rely on external support.
5. *Adherence to Instructions (Follows orders exactly?):*
   - 1 Point: User questions the initial framework, suggests modifications, or shows a desire to go beyond the given instructions. (Equivalent to disagreeing with Q5)
   - 0 Points: User focuses on executing the given plan precisely as described.
6. *Assertiveness/Self-Willed Nature (Perceived as headstrong?):*
   - 1 Point: User is firm in their ideas, defends their position, or shows a strong, self-confident stance. (Equivalent to agreeing with Q6)
   - 0 Points: User is highly agreeable, easily swayed, or avoids conflict.

# Output Format
Your output MUST be in Persian and follow this exact structure. Do not add any introductory or concluding remarks outside this structure. You must calculate the total score and provide the interpretation at the end.

---
*تحلیل نهایی نیاز به استقلال*

*امتیاز کل شما: [Total Score]/6*

*جزئیات امتیازات:*

1. *نگرش به کارهای جدید و نامعمول:* [0 or 1] امتیاز
   * *توجیه:* [Provide a brief justification in Persian based on the user's chat messages.]

2. *تمایل به خودمختاری:* [0 or 1] امتیاز
   * *توجیه:* [Provide a brief justification in Persian based on the user's chat messages.]

3. *ترجیح رهبری:* [0 or 1] امتیاز
   * *توجیه:* [Provide a brief justification in Persian based on the user's chat messages.]

4. *اتکا به خود:* [0 or 1] امتیاز
   * *توجیه:* [Provide a brief justification in Persian based on the user's chat messages.]

5. *پایبندی به دستورالعمل‌ها:* [0 or 1] امتیاز
   * *توجیه:* [Provide a brief justification in Persian based on the user's chat messages.]

6. *قاطعیت و خودرأیی:* [0 or 1] امتیاز
   * *توجیه:* [Provide a brief justification in Persian based on the user's chat messages.]

*تفسیر نتیجه:*
[Based on the Total Score, provide one of the following interpretations in Persian:
- If score is 0-3: "بر اساس تحلیل مکالمه، نیاز شما به استقلال در سطح پایین یا متوسط قرار دارد. شما تمایل دارید در چارچوب‌های مشخص، با دستورالعمل‌های روشن و در همکاری با دیگران کار کنید."
- If score is 4 or higher: "بر اساس تحلیل مکالمه، نیاز شما به استقلال در سطح بالایی قرار دارد. شما از مواجهه با چالش‌های جدید، تصمیم‌گیری مستقلانه و پیشبرد کارها به روش خودتان لذت می‌برید."
]
---
`;

export const DECISION_PROMPT = `
You are an HR analysis assistant. Your only job is to decide if a conversation provides enough information for a full analysis.
Review the chat history and the 6 scoring criteria below.
Can you confidently assign a score (0 or 1) to *ALL SIX* criteria?
You are not performing the analysis, only deciding if it's possible.
Answer with a single word: "YES" or "NO".

# Scoring Criteria:
1. Attitude towards new/unusual tasks (Dislikes unusual work?).
2. Desire for Autonomy (Does things their own way?).
3. Leadership Preference (Happy to let others lead?).
4. Self-Reliance (Rarely needs help?).
5. Adherence to Instructions (Follows orders exactly?).
6. Assertiveness/Self-Willed Nature (Perceived as headstrong?).

# Chat History:
{chat_history_json}
`;

// AI Generation Functions
export async function generateResponse(prompt: string, chatHistory: ChatMessage[] = []): Promise<string> {
  try {
    // Convert chat history to proper Gemini format
    const geminiHistory = chatHistory.map(msg => ({
      role: msg.role,
      parts: msg.parts.map(part => ({ text: part }))
    }));

    console.log('Starting chat with history:', geminiHistory.length, 'messages');
    
    const chat = model.startChat({
      history: geminiHistory,
      generationConfig: {
        temperature: 0.9,
        topK: 1,
        topP: 1,
        maxOutputTokens: 2048,
      },
    });

    const result = await chat.sendMessage(prompt);
    const response = await result.response;
    return response.text();
  } catch (error: any) {
    console.error('Gemini AI Generation Error:', error);
    
    // Handle quota exceeded error
    if (error.status === 429) {
      console.warn('Google AI quota exceeded');
      throw new Error('AI service temporarily unavailable due to quota limits');
    }
    
    // Handle network errors
    if (error.message && error.message.includes('fetch failed')) {
      console.warn('Network error with Gemini API');
      throw new Error('Network error connecting to AI service');
    }
    
    throw new Error('AI service error: ' + error.message);
>>>>>>> fc0a3efc016a7685f72748af01323168e8fd0a3b
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      let historyForChat = history.slice(0, -1);
      if (historyForChat.length > 0 && historyForChat[0].role === 'model') {
        historyForChat = historyForChat.slice(1);
      }
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
      return response.text();

    } catch (error: any) {
      console.error(`Attempt ${attempt} failed:`, error.message);
      if (attempt < retries && (error.message?.includes('503') || error.message?.includes('overloaded'))) {
        console.log(`Model is overloaded. Retrying in ${attempt * 2} seconds...`);
        await delay(attempt * 2000);
      } else {
        return "متاسفانه در حال حاضر قادر به پاسخگویی نیستم. لطفاً لحظاتی دیگر دوباره تلاش کنید.";
      }
    }
  }
  return "پس از چندین تلاش، مدل پاسخی نداد. لطفاً بعداً امتحان کنید.";
};

// تابع جدید برای تولید سوالات تکمیلی
export const generateSupplementaryQuestions = async (conversationJson: string, personaPrompt: string): Promise<{ q1: string, q2: string }> => {
  try {
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    const prompt = `
      You are an expert HR interviewer. Your task is to generate two insightful follow-up questions in Persian based on the provided conversation history and the original persona prompt. The questions should probe deeper into areas where the user was vague, or challenge them on a key competency related to the persona.
      
      **Output ONLY a valid JSON object with two keys: "question1" and "question2". Do not add any other text.**

<<<<<<< HEAD
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
=======
export { model, genAI };

>>>>>>> fc0a3efc016a7685f72748af01323168e8fd0a3b
