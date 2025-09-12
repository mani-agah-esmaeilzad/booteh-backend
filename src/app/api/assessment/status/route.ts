import { NextRequest, NextResponse } from 'next/server';
import { extractTokenFromHeader, authenticateToken } from '@/lib/auth';
import { getConnectionWithRetry } from '@/lib/database';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader || undefined);
    if (!token) {
      return NextResponse.json({ success: false, message: 'توکن ارائه نشده است' }, { status: 401 });
    }

    const decodedToken = authenticateToken(token);
    const userId = decodedToken.userId;

    const connection = await getConnectionWithRetry();
    if (!connection) {
      throw new Error('Failed to get database connection');
    }

    try {
      // ۱. دریافت تمام پرسشنامه‌های موجود
      const [questionnaires] = await connection.execute(
        'SELECT id, name, description FROM questionnaires ORDER BY id ASC'
      );

      // ۲. دریافت تمام ارزیابی‌های تکمیل شده توسط کاربر
      const [completedAssessments] = await connection.execute(
        'SELECT questionnaire_id FROM assessments WHERE user_id = ? AND completed_at IS NOT NULL',
        [userId]
      );

      const completedIds = (Array.isArray(completedAssessments) ? completedAssessments : []).map((a: any) => a.questionnaire_id);

      let currentFound = false;
      const assessmentsWithStatus = (Array.isArray(questionnaires) ? questionnaires : []).map((q: any) => {
        const stringId = q.name.toLowerCase().replace(/\s+/g, '-');

        let status: 'completed' | 'current' | 'locked' = 'locked';

        if (completedIds.includes(q.id)) {
          status = 'completed';
        } else if (!currentFound) {
          status = 'current';
          currentFound = true;
        }

        return {
          id: q.id, // ID عددی برای فراخوانی API
          stringId: stringId, // ID رشته‌ای برای URL
          title: `ارزیابی ${q.name}`,
          description: q.description,
          path: `/assessment/${stringId}`,
          status: status,
        };
      });

      return NextResponse.json({
        success: true,
        data: assessmentsWithStatus
      });

    } finally {
      connection.release();
    }

  } catch (error: any) {
    console.error('خطا در دریافت وضعیت ارزیابی‌ها:', error);
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return NextResponse.json({ success: false, message: 'توکن نامعتبر یا منقضی شده است' }, { status: 401 });
    }
    return NextResponse.json({ success: false, message: 'خطای سرور' }, { status: 500 });
  }
}