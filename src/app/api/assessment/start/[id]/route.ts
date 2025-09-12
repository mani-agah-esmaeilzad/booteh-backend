import { NextRequest, NextResponse } from 'next/server';
import { extractTokenFromHeader, authenticateToken } from '@/lib/auth';
import { getConnectionWithRetry } from '@/lib/database';
import { v4 as uuidv4 } from 'uuid';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = extractTokenFromHeader(request.headers.get('authorization'));
    if (!token) {
      return NextResponse.json({ success: false, message: 'توکن ارائه نشده است' }, { status: 401 });
    }

    const decodedToken = authenticateToken(token);
    const userId = decodedToken.userId;
    const questionnaireId = parseInt(params.id, 10);

    if (isNaN(questionnaireId)) {
      return NextResponse.json({ success: false, message: 'ID پرسشنامه نامعتبر است' }, { status: 400 });
    }

    const connection = await getConnectionWithRetry();
    if (!connection) throw new Error('Failed to get database connection');

    try {
      const [users] = await connection.execute('SELECT first_name, last_name, work_experience FROM users WHERE id = ?', [userId]);
      const [questionnaires] = await connection.execute('SELECT * FROM questionnaires WHERE id = ?', [questionnaireId]);

      if (!Array.isArray(users) || users.length === 0) throw new Error('کاربر یافت نشد');
      if (!Array.isArray(questionnaires) || questionnaires.length === 0) throw new Error('پرسشنامه یافت نشد');

      const user = users[0] as any;
      const questionnaire = questionnaires[0] as any;

      const userName = `${user.first_name} ${user.last_name}`.trim();
      const userJob = user.work_experience || "حوزه کاری شما";

      const sessionId = uuidv4();

      // ✅ اصلاح کلیدی: پیام اولیه مستقیماً از دیتابیس خوانده و شخصی‌سازی می‌شود و دیگر AI آن را تولید نمی‌کند
      const openingLine = questionnaire.initial_prompt
        .replace(/{user_name}/g, userName)
        .replace(/{user_job}/g, userJob);

      const [result] = await connection.execute(
        'INSERT INTO assessments (user_id, questionnaire_id, session_id, max_score, created_at) VALUES (?, ?, ?, ?, NOW())',
        [userId, questionnaireId, sessionId, 6]
      );
      const assessmentId = (result as any).insertId;

      await connection.execute(
        'INSERT INTO chat_messages (assessment_id, user_id, message_type, content, character_name, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
        [assessmentId, userId, 'ai', openingLine, questionnaire.name]
      );

      return NextResponse.json({
        success: true,
        message: `گفتگوی ارزیابی ${questionnaire.name} شروع شد`,
        data: {
          sessionId: sessionId,
          message: openingLine, // پیام ثابت و شخصی‌سازی شده
          assessmentId: assessmentId,
          settings: {
            has_narrator: questionnaire.has_narrator,
            character_count: questionnaire.character_count,
            has_timer: questionnaire.has_timer,
            timer_duration: questionnaire.timer_duration,
            min_questions: questionnaire.min_questions,
            max_questions: questionnaire.max_questions,
          },
          timestamp: new Date().toISOString()
        }
      });

    } finally {
      connection.release();
    }

  } catch (error: any) {
    console.error('خطا در شروع ارزیابی:', error);
    return NextResponse.json({ success: false, message: error.message || 'خطای سرور' }, { status: 500 });
  }
}