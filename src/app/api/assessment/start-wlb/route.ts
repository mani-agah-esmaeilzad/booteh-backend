// File: src/app/api/assessment/start-wlb/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { extractTokenFromHeader, authenticateToken } from '@/lib/auth';
import { ConversationManager } from '@/lib/ai-conversations';
// WLB_SYSTEM_PROMPT دیگر برای استخراج پیام استفاده نمی‌شود، اما برای ثبات آن را نگه می‌داریم
import { WLB_SYSTEM_PROMPT } from '@/lib/wlb-analysis';
import { getConnectionWithRetry } from '@/lib/database';

export async function POST(request: NextRequest) {
  let connection;
  try {
    // --- Authentication ---
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);
    if (!token) {
      return NextResponse.json({ success: false, message: 'توکن ارائه نشده است' }, { status: 401 });
    }
    const decodedToken = authenticateToken(token);
    const userId = decodedToken.userId;

    // --- Database Interaction ---
    connection = await getConnectionWithRetry();
    
    const [users] = await connection.execute('SELECT first_name, last_name FROM users WHERE id = ?', [userId]);
    const userData = (users as any[])[0];

    if (!userData) {
        console.error(`User with ID ${userId} from token not found in database.`);
        return NextResponse.json({ success: false, message: 'کاربر شناسایی نشد.' }, { status: 404 });
    }
    
    const userName = `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || 'کاربر';

    // --- Start Assessment Logic ---
    const [result] = await connection.execute(
      'INSERT INTO assessments (user_id, questionnaire_id, created_at) VALUES (?, ?, NOW())',
      [userId, 3] // ID=3 for WLB questionnaire
    );
    const assessmentId = (result as any).insertId;
    if (!assessmentId) {
        throw new Error("Failed to create assessment record in the database.");
    }

    // --- AI Conversation Setup ---
    
    // ✅ مشکل اینجا بود. به جای split کردن، پیام را مستقیماً تعریف می‌کنیم
    const openingLineTemplate = "سلام {user_name} عزیز، وقت بخیر. من دکتر علوی هستم. خوشحالم که برای این گفتگو فرصت گذاشتی. هدف ما اینه که کمی در مورد دیدگاه شما درباره مرز بین کار و زندگی شخصی صحبت کنیم. بیا با یک سناریوی ساده شروع کنیم: تصور کن یک روز کاری سخت رو پشت سر گذاشتی و دقیقاً در لحظه‌ای که می‌خوای محل کار رو ترک کنی، مدیرت یک وظیفه فوری بهت می‌ده که انجامش چند ساعت طول می‌کشه. در این موقعیت چه واکنشی نشون می‌دی و چه تصمیمی می‌گیری؟";
    const openingLine = openingLineTemplate.replace('{user_name}', userName);

    const sessionId = `wlb-${assessmentId}`;
    const session = ConversationManager.createSession(userName, String(userId), sessionId);
    ConversationManager.addMessage(session.sessionId, 'model', openingLine);
    
    // Log the first message
    await connection.execute(
      'INSERT INTO chat_messages (assessment_id, user_id, message_type, content, character_name) VALUES (?, ?, ?, ?, ?)',
      [assessmentId, userId, 'ai', openingLine, 'دکتر علوی']
    );

    console.log(`WLB Assessment (ID: ${assessmentId}) started for user ${userId} (${userName})`);

    return NextResponse.json({
      success: true,
      message: 'آزمون تعادل کار و زندگی شروع شد',
      chatId: assessmentId,
      initialMessages: [{ role: 'model', text: openingLine }]
    });

  } catch (error: any) {
    console.error('Error starting WLB assessment:', error);
    const errorMessage = 'خطای داخلی سرور رخ داده است.';
    return NextResponse.json({ success: false, message: errorMessage, error: error.message }, { status: 500 });
  } finally {
    if (connection) {
      connection.release();
    }
  }
}
