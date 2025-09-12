// فایل کامل: mani-agah-esmaeilzad/test/src/app/api/admin/questionnaires/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';
// import { authenticateToken } from '@/lib/auth'; // برای استفاده در پروژه واقعی

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // در یک پروژه واقعی، حتماً باید توکن ادمین را چک کنید
    // const token = request.headers.get('authorization')?.split(' ')[1];
    // if (!token || authenticateToken(token).role !== 'admin') {
    //   return NextResponse.json({ success: false, message: 'دسترسی غیرمجاز' }, { status: 403 });
    // }

    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ success: false, message: 'ID نامعتبر است' }, { status: 400 });
    }

    const connection = await pool.getConnection();
    try {
      // به دلیل وجود روابط بین جداول (Foreign Key)، ابتدا باید رکوردهای وابسته را حذف کنیم
      // این کوئری تمام ارزیابی‌های مرتبط با این پرسشنامه را حذف می‌کند
      // و به لطف `ON DELETE CASCADE`، تمام پیام‌های چت و توکن‌های مربوط به آن ارزیابی‌ها نیز حذف می‌شوند.
      await connection.execute('DELETE FROM assessments WHERE questionnaire_id = ?', [id]);
      
      // حالا خود پرسشنامه را حذف می‌کنیم
      const [result] = await connection.execute('DELETE FROM questionnaires WHERE id = ?', [id]);
      
      const deleteResult = result as any;
      if (deleteResult.affectedRows === 0) {
        return NextResponse.json({ success: false, message: 'پرسشنامه یافت نشد' }, { status: 404 });
      }

      return NextResponse.json({ success: true, message: 'پرسشنامه و تمام نتایج مرتبط با آن با موفقیت حذف شد' });

    } finally {
      connection.release();
    }

  } catch (error: any) {
    console.error(`Error deleting questionnaire with id ${params.id}:`, error);
    // اگر خطا به خاطر foreign key بود، پیام مناسب‌تری می‌دهیم
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
         return NextResponse.json({ success: false, message: 'ابتدا باید نتایج ارزیابی‌های مرتبط با این پرسشنامه حذف شوند.' }, { status: 409 });
    }
    return NextResponse.json({ success: false, message: 'خطای سرور' }, { status: 500 });
  }
}