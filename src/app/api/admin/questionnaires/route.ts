import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';
import { z } from 'zod';

// Schema بدون فیلدهای سوالات تکمیلی
const createQuestionnaireSchema = z.object({
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


// GET: دریافت لیست تمام پرسشنامه‌ها
export async function GET(request: NextRequest) {
  try {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute('SELECT * FROM questionnaires ORDER BY id ASC');
      return NextResponse.json({ success: true, data: rows });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error fetching questionnaires:', error);
    return NextResponse.json({ success: false, message: 'خطای سرور' }, { status: 500 });
  }
}

// POST: ایجاد یک پرسشنامه جدید
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = createQuestionnaireSchema.parse(body);

    const connection = await pool.getConnection();
    try {
      await connection.execute(
        `INSERT INTO questionnaires (
          name, description, initial_prompt, persona_prompt, analysis_prompt,
          has_narrator, character_count, has_timer, timer_duration,
          min_questions, max_questions
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.name, data.description, data.initial_prompt, data.persona_prompt, data.analysis_prompt,
          data.has_narrator, data.character_count, data.has_timer, data.timer_duration,
          data.min_questions, data.max_questions
        ]
      );
      return NextResponse.json({ success: true, message: 'پرسشنامه با موفقیت ایجاد شد' }, { status: 201 });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error creating questionnaire:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, message: 'داده‌های ورودی نامعتبر است', errors: error.errors }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: 'خطای سرور' }, { status: 500 });
  }
}