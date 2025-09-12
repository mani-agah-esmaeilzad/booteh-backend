// src/app/api/assessment/start-negotiation/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { extractTokenFromHeader, authenticateToken } from '@/lib/auth';
import { getConnectionWithRetry } from '@/lib/database';

export async function POST(request: NextRequest) {
  let connection;
  try {
    console.log("1. 'start-negotiation' API called.");
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);
    if (!token) {
      return NextResponse.json({ success: false, message: 'توکن ارائه نشده است' }, { status: 401 });
    }
    const decodedToken = authenticateToken(token);
    const userId = decodedToken.userId;
    console.log(`2. User authenticated with ID: ${userId}`);

    console.log("3. Attempting to get database connection...");
    connection = await getConnectionWithRetry();
    console.log("4. Database connection successful.");

    const [users] = await connection.execute('SELECT first_name, last_name FROM users WHERE id = ?', [userId]);
    const userData = (users as any[])[0];

    if (!userData) {
        console.error(`5. CRITICAL: User with ID ${userId} not found in database.`);
        return NextResponse.json({ success: false, message: 'کاربر شناسایی نشد.' }, { status: 404 });
    }
    
    const userName = `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || 'کاربر';
    console.log(`5. User found: ${userName}`);

    console.log("6. Attempting to insert into 'assessments' table with questionnaire_id=6...");
    const [result] = await connection.execute(
      'INSERT INTO assessments (user_id, questionnaire_id, created_at) VALUES (?, ?, NOW())',
      [userId, 6] // ID=6 for Negotiation questionnaire
    );
    const assessmentId = (result as any).insertId;
    if (!assessmentId) {
        throw new Error("Failed to create assessment record.");
    }
    console.log(`7. 'assessments' record created with ID: ${assessmentId}`);
    
    const openingLineTemplate = "وقت بخیر {user_name}، توکلی هستم. ممنون از وقتی که گذاشتید. ما پیشنهادتون رو برای تامین قطعات بررسی کردیم. راستش رو بخواهید، قیمتی که ارائه دادید خیلی بالاتر از حد انتظار و بودجه ماست. اگر بخوایم همکاری رو ادامه بدیم، باید به راه حل بهتری برسیم. پیشنهاد شما برای شروع چیه؟";
    const openingLine = openingLineTemplate.replace('{user_name}', userName);

    console.log("8. Attempting to insert into 'chat_messages' table...");
    await connection.execute(
      'INSERT INTO chat_messages (assessment_id, user_id, message_type, content, character_name) VALUES (?, ?, ?, ?, ?)',
      [assessmentId, userId, 'ai', openingLine, 'آقای توکلی']
    );
    console.log("9. Initial chat message inserted successfully.");

    return NextResponse.json({
      success: true,
      message: 'آزمون مهارت‌های مذاکره شروع شد',
      chatId: assessmentId,
      initialMessages: [{ role: 'model', text: openingLine }]
    });

  } catch (error: any) {
    // This will now log the detailed error to your server console
    console.error('💥💥💥 CRITICAL ERROR in start-negotiation API 💥💥💥:', error);
    return NextResponse.json({ success: false, message: 'خطای داخلی سرور', error: error.message }, { status: 500 });
  } finally {
    if (connection) {
      console.log("10. Releasing database connection.");
      connection.release();
    }
  }
}
