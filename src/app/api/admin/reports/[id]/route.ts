import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // در اینجا نیز باید احراز هویت ادمین چک شود
        const id = parseInt(params.id, 10);
        if (isNaN(id)) {
            return NextResponse.json({ success: false, message: 'ID گزارش نامعتبر است' }, { status: 400 });
        }

        const connection = await pool.getConnection();
        try {
            // دریافت اطلاعات اصلی گزارش
            const [reportRows] = await connection.execute(
                `SELECT
          a.id, a.score, a.description, a.completed_at,
          u.first_name, u.last_name, u.email,
          q.name as questionnaire_name
        FROM assessments a
        JOIN users u ON a.user_id = u.id
        JOIN questionnaires q ON a.questionnaire_id = q.id
        WHERE a.id = ?`,
                [id]
            );

            if (!Array.isArray(reportRows) || reportRows.length === 0) {
                return NextResponse.json({ success: false, message: 'گزارش یافت نشد' }, { status: 404 });
            }

            // دریافت تاریخچه کامل چت برای این گزارش
            const [chatRows] = await connection.execute(
                'SELECT message_type, content, character_name, created_at FROM chat_messages WHERE assessment_id = ? ORDER BY created_at ASC',
                [id]
            );

            const reportData = reportRows[0];
            const chatHistory = Array.isArray(chatRows) ? chatRows : [];

            return NextResponse.json({
                success: true,
                data: {
                    report: reportData,
                    chatHistory: chatHistory
                }
            });

        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('Error fetching single report:', error);
        return NextResponse.json({ success: false, message: 'خطای سرور در دریافت جزئیات گزارش' }, { status: 500 });
    }
}