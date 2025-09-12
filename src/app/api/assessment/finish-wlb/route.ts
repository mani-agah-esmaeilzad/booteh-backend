// File: src/app/api/assessment/finish-wlb/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { extractTokenFromHeader, authenticateToken } from '@/lib/auth';
import { analyzeConversation } from '@/lib/ai-gemini';
import { WLB_ANALYSIS_PROMPT } from '@/lib/wlb-analysis';
import { getConnectionWithRetry } from '@/lib/database';

// A helper function to find and parse JSON from the AI's potentially messy response
function extractAndParseJson(text: string): any {
  // Find the start and end of the JSON block
  const jsonStart = text.indexOf('{');
  const jsonEnd = text.lastIndexOf('}');

  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error('پاسخ هوش مصنوعی شامل ساختار JSON معتبر نبود.');
  }

  const jsonString = text.substring(jsonStart, jsonEnd + 1);
  
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Failed to parse extracted JSON:", jsonString);
    throw new Error('خطا در تبدیل پاسخ هوش مصنوعی به فرمت JSON.');
  }
}


export async function POST(request: NextRequest) {
  let connection;
  try {
    const body = await request.json();
    const { chatId: assessmentId } = body;

    // --- Authentication ---
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);
    if (!token) return NextResponse.json({ success: false, message: 'توکن ارائه نشده است' }, { status: 401 });
    const decodedToken = authenticateToken(token);
    const userId = decodedToken.userId;
    
    // ✅ Step 1: Fetch conversation history directly from the database
    connection = await getConnectionWithRetry();
    const [messages] = await connection.execute(
      'SELECT message_type, content FROM chat_messages WHERE assessment_id = ? ORDER BY created_at ASC',
      [assessmentId]
    );

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ success: false, message: 'تاریخچه گفتگو یافت نشد.' }, { status: 404 });
    }

    // Format the history for the AI prompt
    const historyJson = JSON.stringify(
      (messages as any[]).map(msg => ({
        role: msg.message_type === 'ai' ? 'model' : 'user',
        text: msg.content
      }))
    );
    
    // ✅ Step 2: Call the AI for analysis
    const fullAnalysisPrompt = WLB_ANALYSIS_PROMPT.replace('{chat_history_json}', historyJson);
    const analysisResultText = await analyzeConversation(fullAnalysisPrompt);

    // ✅ Step 3: Robustly parse the AI response
    const analysisResult = extractAndParseJson(analysisResultText);

    // ✅ Step 4: Update the database with the results
    await connection.execute(
      'UPDATE assessments SET description = ?, score = ?, completed_at = NOW() WHERE id = ? AND user_id = ?',
      [JSON.stringify(analysisResult), analysisResult.total_score, assessmentId, userId]
    );

    return NextResponse.json({ success: true, analysis: analysisResult });

  } catch (error: any) {
    console.error('Error finishing WLB assessment:', error);
    return NextResponse.json({ success: false, message: error.message || 'خطای سرور هنگام تحلیل' }, { status: 500 });
  } finally {
    if (connection) {
      connection.release();
    }
  }
}
