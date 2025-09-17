// فایل کامل: src/app/api/admin/questionnaires/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';
import { z } from 'zod';
import { authenticateToken, extractTokenFromHeader } from '@/lib/auth';

// Schema برای آپدیت، مشابه schema ساخت است
const updateQuestionnaireSchema = z.object({
  name: z.string().min(3, "نام باید حداقل ۳ کاراکتر باشد"),
  description: z.string().min(10, "توضیحات باید حداقل ۱۰ کاراکتر باشد"),
  initial_prompt: z.string().min(20, "پرامپت اولیه باید حداقل ۲۰ کاراکتر باشد"),
  persona_prompt: z.string().min(20, "پرامپت شخصیت باید حداقل ۲۰ کاراکتر باشد"),
  analysis_prompt: z.string().min(20, "پرامپت تحلیل باید حداقل ۲۰ کاراکتر باشد"),
  has_narrator: z.boolean(),
  character_count: z.number().int().min(1),
  has_timer: z.boolean(),
  timer_duration: z.number().int().min(1),
  min_questions: z.number().int().min(1),
  max_questions: z.number().int().min(1),
}).refine(data => data.min_questions <= data.max_questions, {
  message: "حداقل تعداد سوالات باید کمتر یا مساوی حداکثر باشد",
  path: ["min_questions"],
});


// GET: دریافت اطلاعات یک پرسشنامه خاص
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const questionnaireId = parseInt(params.id, 10);
    if (isNaN(questionnaireId)) {
      return NextResponse.json({ success: false, message: 'ID نامعتبر است' }, { status: 400 });
    }

    const connection = await pool.getConnection();
    const [rows]: any[] = await connection.execute('SELECT * FROM questionnaires WHERE id = ?', [questionnaireId]);
    connection.release();

    if (rows.length === 0) {
      return NextResponse.json({ success: false, message: 'پرسشنامه یافت نشد' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error(`Error fetching questionnaire ${params.id}:`, error);
    return NextResponse.json({ success: false, message: 'خطای سرور' }, { status: 500 });
  }
}

// PUT: به‌روزرسانی یک پرسشنامه
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const questionnaireId = parseInt(params.id, 10);
    if (isNaN(questionnaireId)) {
      return NextResponse.json({ success: false, message: 'ID نامعتبر است' }, { status: 400 });
    }

    const body = await request.json();
    const data = updateQuestionnaireSchema.parse(body);

    const connection = await pool.getConnection();
    await connection.execute(
      `UPDATE questionnaires SET
        name = ?, description = ?, initial_prompt = ?, persona_prompt = ?, analysis_prompt = ?,
        has_narrator = ?, character_count = ?, has_timer = ?, timer_duration = ?,
        min_questions = ?, max_questions = ?
      WHERE id = ?`,
      [
        data.name, data.description, data.initial_prompt, data.persona_prompt, data.analysis_prompt,
        data.has_narrator, data.character_count, data.has_timer, data.timer_duration,
        data.min_questions, data.max_questions,
        questionnaireId
      ]
    );
    connection.release();

    return NextResponse.json({ success: true, message: 'پرسشنامه با موفقیت به‌روزرسانی شد' });
  } catch (error) {
    console.error(`Error updating questionnaire ${params.id}:`, error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, message: 'داده‌های ورودی نامعتبر است', errors: error.errors }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: 'خطای سرور' }, { status: 500 });
  }
}


// DELETE: حذف یک پرسشنامه
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
     // احراز هویت ادمین
    const token = extractTokenFromHeader(request.headers.get('authorization'));
    if (!token) return NextResponse.json({ success: false, message: 'توکن ارائه نشده است' }, { status: 401 });
    const decoded = authenticateToken(token);
    if (decoded.role !== 'admin') return NextResponse.json({ success: false, message: 'دسترسی غیرمجاز' }, { status: 403 });
    
    const questionnaireId = parseInt(params.id, 10);
    if (isNaN(questionnaireId)) {
      return NextResponse.json({ success: false, message: 'ID نامعتبر است' }, { status: 400 });
    }

    const connection = await pool.getConnection();
    // ابتدا ارزیابی‌های مرتبط را حذف می‌کنیم (چون ON DELETE CASCADE ممکن است تنظیم نباشد)
    await connection.execute('DELETE FROM assessments WHERE questionnaire_id = ?', [questionnaireId]);
    // سپس خود پرسشنامه را حذف می‌کنیم
    const [result]: any = await connection.execute('DELETE FROM questionnaires WHERE id = ?', [questionnaireId]);
    connection.release();

    if (result.affectedRows === 0) {
      return NextResponse.json({ success: false, message: 'پرسشنامه یافت نشد' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'پرسشنامه و ارزیابی‌های مرتبط با موفقیت حذف شدند' });
  } catch (error) {
    console.error(`Error deleting questionnaire ${params.id}:`, error);
    return NextResponse.json({ success: false, message: 'خطای سرور' }, { status: 500 });
  }
}
