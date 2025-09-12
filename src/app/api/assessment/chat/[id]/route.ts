import { NextRequest, NextResponse } from 'next/server';
import { extractTokenFromHeader, authenticateToken } from '@/lib/auth';
import { chatRequestSchema } from '@/lib/validation';
import { ConversationManager } from '@/lib/ai-conversations';
import { generateResponse } from '@/lib/ai-gemini';
import { getConnectionWithRetry } from '@/lib/database';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let connection;
  try {
    const token = extractTokenFromHeader(request.headers.get('authorization'));
    if (!token) return NextResponse.json({ success: false, message: 'توکن ارائه نشده است' }, { status: 401 });

    const decodedToken = authenticateToken(token);
    const userId = decodedToken.userId;
    const assessmentId = parseInt(params.id, 10);
    if (isNaN(assessmentId)) return NextResponse.json({ success: false, message: 'ID ارزیابی نامعتبر است' }, { status: 400 });

    const body = await request.json();
    const { message, session_id } = chatRequestSchema.parse(body);

    connection = await getConnectionWithRetry();
    if (!connection) throw new Error('اتصال به دیتابیس برقرار نشد');

    await connection.execute(
      'INSERT INTO chat_messages (assessment_id, user_id, message_type, content, character_name) VALUES (?, ?, ?, ?, ?)',
      [assessmentId, userId, 'user', message, 'کاربر']
    );

    const [dbHistory] = await connection.execute(
      'SELECT * FROM chat_messages WHERE assessment_id = ? ORDER BY created_at ASC',
      [assessmentId]
    );
    const fullHistory = ConversationManager.formatHistoryForGemini(dbHistory as any[]);

    // ✅ اصلاح کلیدی: خواندن اطلاعات کاربر و پرسشنامه در هر درخواست چت
    const [users] = await connection.execute('SELECT first_name, last_name, work_experience FROM users WHERE id = ?', [userId]);
    const [assessments] = await connection.execute('SELECT questionnaire_id FROM assessments WHERE id = ?', [assessmentId]);
    if (!Array.isArray(assessments) || assessments.length === 0) throw new Error('ارزیابی یافت نشد');
    const questionnaireId = (assessments[0] as any).questionnaire_id;
    const [questionnaires] = await connection.execute('SELECT * FROM questionnaires WHERE id = ?', [questionnaireId]);

    if (!Array.isArray(users) || users.length === 0) throw new Error('کاربر یافت نشد');
    if (!Array.isArray(questionnaires) || questionnaires.length === 0) throw new Error('پرسشنامه یافت نشد');

    const user = users[0] as any;
    const questionnaire = questionnaires[0] as any;
    const userName = `${user.first_name} ${user.last_name}`.trim();
    const userJob = user.work_experience || "حوزه کاری شما";

    // ✅ اصلاح کلیدی: شخصی‌سازی پرامپت شخصیت در هر بار ارسال پیام
    const systemInstruction = questionnaire.persona_prompt
      .replace(/{user_name}/g, userName)
      .replace(/{user_job}/g, userJob)
      .replace(/{min_questions}/g, questionnaire.min_questions.toString())
      .replace(/{max_questions}/g, questionnaire.max_questions.toString());

    let aiResponse = await generateResponse(systemInstruction, fullHistory);
    if (!aiResponse) throw new Error('پاسخ خالی از هوش مصنوعی');

    let isComplete = false;
    if (aiResponse.includes('[END_ASSESSMENT]')) {
      isComplete = true;
      aiResponse = aiResponse.replace('[END_ASSESSMENT]', '').trim();
    }

    await connection.execute(
      'INSERT INTO chat_messages (assessment_id, user_id, message_type, content, character_name) VALUES (?, ?, ?, ?, ?)',
      [assessmentId, userId, 'ai', aiResponse, questionnaire.name]
    );

    return NextResponse.json({
      success: true,
      data: {
        aiResponse: aiResponse,
        sessionId: session_id,
        isComplete: isComplete
      }
    });

  } catch (error: any) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ success: false, message: error.message || 'خطای سرور' }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}