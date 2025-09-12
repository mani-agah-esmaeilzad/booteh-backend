// src/app/api/assessment/chat-confidence/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { extractTokenFromHeader, authenticateToken } from '@/lib/auth';
import { generateResponse } from '@/lib/ai-gemini';
import { CONFIDENCE_SYSTEM_PROMPT } from '@/lib/confidence-analysis';
import { getConnectionWithRetry } from '@/lib/database';

export async function POST(request: NextRequest) {
    let connection;
  try {
    const body = await request.json();
    const { message, chatId: assessmentId } = body;

    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);
    if (!token) return NextResponse.json({ success: false, message: 'توکن ارائه نشده است' }, { status: 401 });
    const decodedToken = authenticateToken(token);
    const userId = decodedToken.userId;

    connection = await getConnectionWithRetry();
    const [users] = await connection.execute('SELECT first_name, last_name FROM users WHERE id = ?', [userId]);
    const userName = (users as any[])[0]?.first_name || 'کاربر';
    
    await connection.execute(
        'INSERT INTO chat_messages (assessment_id, user_id, message_type, content, character_name) VALUES (?, ?, ?, ?, ?)',
        [assessmentId, userId, 'user', message, userName]
    );

    const [messages] = await connection.execute('SELECT message_type, content FROM chat_messages WHERE assessment_id = ? ORDER BY created_at ASC', [assessmentId]);

    const historyForAI = (messages as any[]).map(msg => ({
      role: msg.message_type === 'ai' ? 'model' : 'user',
      parts: [msg.content]
    }));

    const systemPrompt = CONFIDENCE_SYSTEM_PROMPT.split('# Conversation Flow and Rules')[0].replace('{user_name}', userName);
    const fullPrompt = `${systemPrompt}\n\n${historyForAI.map(m => `${m.role}: ${m.parts[0]}`).join('\n')}\n\nuser: ${message}\nmodel:`;
    
    const aiReply = await generateResponse(fullPrompt, []);

    await connection.execute(
        'INSERT INTO chat_messages (assessment_id, user_id, message_type, content, character_name) VALUES (?, ?, ?, ?, ?)',
        [assessmentId, userId, 'ai', aiReply, 'خانم امیری']
    );

    return NextResponse.json({ success: true, reply: aiReply });

  } catch (error) {
    console.error('Error in Confidence chat:', error);
    return NextResponse.json({ success: false, message: 'خطای سرور' }, { status: 500 });
  } finally {
      if (connection) connection.release();
  }
}
