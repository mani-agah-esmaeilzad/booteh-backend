// src/app/api/assessment/start-confidence/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { extractTokenFromHeader, authenticateToken } from '@/lib/auth';
import { getConnectionWithRetry } from '@/lib/database';

export async function POST(request: NextRequest) {
  let connection;
  try {
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);
    if (!token) {
      return NextResponse.json({ success: false, message: 'توکن ارائه نشده است' }, { status: 401 });
    }
    const decodedToken = authenticateToken(token);
    const userId = decodedToken.userId;

    connection = await getConnectionWithRetry();
    const [users] = await connection.execute('SELECT first_name, last_name FROM users WHERE id = ?', [userId]);
    const userData = (users as any[])[0];

    if (!userData) {
        return NextResponse.json({ success: false, message: 'کاربر شناسایی نشد.' }, { status: 404 });
    }
    
    const userName = `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || 'کاربر';
    
    const [result] = await connection.execute(
      'INSERT INTO assessments (user_id, questionnaire_id, created_at) VALUES (?, ?, NOW())',
      [userId, 5] // ID=5 for Confidence questionnaire
    );
    const assessmentId = (result as any).insertId;
    if (!assessmentId) {
        throw new Error("Failed to create assessment record.");
    }
    
    const openingLineTemplate = "سلام {user_name}، وقت شما بخیر. من امیری هستم، مشاور توسعه فردی. خوشحالم که امروز صحبت می‌کنیم. هدف ما بررسی دیدگاه شما نسبت به توانایی‌ها و چالش‌های حرفه‌ای است. تصور کنید در یک پروژه مهم، فرصتی برای ارائه یک ایده جدید و پرریسک به مدیران ارشد به شما داده می‌شود. شما به ایده خود ایمان دارید اما می‌دانید که ممکن است با مخالفت‌هایی روبرو شود. در این موقعیت چه احساسی دارید و چطور خود را برای ارائه آماده می‌کنید؟";
    const openingLine = openingLineTemplate.replace('{user_name}', userName);

    await connection.execute(
      'INSERT INTO chat_messages (assessment_id, user_id, message_type, content, character_name) VALUES (?, ?, ?, ?, ?)',
      [assessmentId, userId, 'ai', openingLine, 'خانم امیری']
    );

    return NextResponse.json({
      success: true,
      message: 'آزمون اعتماد به نفس شروع شد',
      chatId: assessmentId,
      initialMessages: [{ role: 'model', text: openingLine }]
    });

  } catch (error: any) {
    console.error('Error starting Confidence assessment:', error);
    return NextResponse.json({ success: false, message: 'خطای داخلی سرور' }, { status: 500 });
  } finally {
    if (connection) {
      connection.release();
    }
  }
}
