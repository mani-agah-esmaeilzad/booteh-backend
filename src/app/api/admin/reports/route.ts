import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';
import { authenticateToken } from '@/lib/auth'; // برای امنیت

export async function GET(request: NextRequest) {
    try {
        // در یک پروژه واقعی، حتماً باید توکن ادمین را چک کنید
        // const token = request.headers.get('authorization')?.split(' ')[1];
        // if (!token || authenticateToken(token).role !== 'admin') {
        //   return NextResponse.json({ success: false, message: 'دسترسی غیرمجاز' }, { status: 403 });
        // }

        const connection = await pool.getConnection();
        try {
            // کوئری برای دریافت گزارش‌ها با جوین کردن سه جدول
            const [rows] = await connection.execute(
                `SELECT
          a.id,
          a.score,
          a.description,
          a.completed_at,
          u.first_name,
          u.last_name,
          u.email,
          q.name as questionnaire_name
        FROM assessments a
        JOIN users u ON a.user_id = u.id
        JOIN questionnaires q ON a.questionnaire_id = q.id
        WHERE a.completed_at IS NOT NULL
        ORDER BY a.completed_at DESC`
            );

            return NextResponse.json({ success: true, data: rows });

        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('Error fetching reports:', error);
        return NextResponse.json({ success: false, message: 'خطای سرور در دریافت گزارش‌ها' }, { status: 500 });
    }
}