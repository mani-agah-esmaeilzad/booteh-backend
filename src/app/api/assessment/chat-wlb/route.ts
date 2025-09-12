// src/app/api/assessment/chat-wlb/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { extractTokenFromHeader, authenticateToken } from '@/lib/auth';
import { ConversationManager } from '@/lib/ai-conversations';
import { generateResponse } from '@/lib/ai-gemini'; // We can reuse the generic generator
import { WLB_SYSTEM_PROMPT } from '@/lib/wlb-analysis';
import { getConnectionWithRetry } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, chatId: assessmentId } = body;

    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);
    if (!token) return NextResponse.json({ success: false, message: 'توکن ارائه نشده است' }, { status: 401 });
    const decodedToken = authenticateToken(token);
    const userId = decodedToken.userId;

    // Use a unique session ID for the in-memory conversation
    const sessionId = `wlb-${assessmentId}`;
    let session = ConversationManager.getSession(sessionId);
    if (!session) {
        const userRes = await getConnectionWithRetry().then(conn => conn.execute('SELECT first_name, last_name FROM users WHERE id = ?', [userId]));
        const userName = (userRes[0] as any[])[0]?.first_name || 'کاربر';
        session = ConversationManager.createSession(userName, String(userId), sessionId);
    }
    
    ConversationManager.addMessage(sessionId, 'user', message);

    const systemPrompt = WLB_SYSTEM_PROMPT.split('# Conversation Flow and Rules')[0].replace('{user_name}', session.userName);
    const historyForAI = ConversationManager.getHistoryForGemini(sessionId);
    const fullPrompt = `${systemPrompt}\n\nConversation History:\n${historyForAI.map(m => `${m.role}: ${m.parts[0]}`).join('\n')}\n\nuser: ${message}\nmodel:`;

    const aiReply = await generateResponse(fullPrompt, []);
    ConversationManager.addMessage(sessionId, 'model', aiReply);

    const connection = await getConnectionWithRetry();
    try {
        await connection.execute(
            'INSERT INTO chat_messages (assessment_id, user_id, message_type, content, character_name) VALUES (?, ?, ?, ?, ?)',
            [assessmentId, userId, 'user', message, 'کاربر']
        );
        await connection.execute(
            'INSERT INTO chat_messages (assessment_id, user_id, message_type, content, character_name) VALUES (?, ?, ?, ?, ?)',
            [assessmentId, userId, 'ai', aiReply, 'دکتر علوی']
        );
    } finally {
        connection.release();
    }

    return NextResponse.json({ success: true, reply: aiReply });

  } catch (error) {
    console.error('Error in WLB chat:', error);
    return NextResponse.json({ success: false, message: 'خطای سرور' }, { status: 500 });
  }
}
