// فایل کامل جدید: src/app/api/admin/users/[id]/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';
import { authenticateToken, extractTokenFromHeader } from '@/lib/auth';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const statusUpdateSchema = z.object({
  is_active: z.boolean(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. احراز هویت ادمین
    const token = extractTokenFromHeader(request.headers.get('authorization'));
    if (!token) return NextResponse.json({ success: false, message: 'توکن ارائه نشده است' }, { status: 401 });
    
    const decodedToken = authenticateToken(token);
    if (decodedToken.role !== 'admin') return NextResponse.json({ success: false, message: 'دسترسی غیرمجاز' }, { status: 403 });

    const userId = parseInt(params.id, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ success: false, message: 'ID کاربر نامعتبر است' }, { status: 400 });
    }

    // 2. اعتبارسنجی بدنه درخواست
    const body = await request.json();
    const { is_active } = statusUpdateSchema.parse(body);

    // 3. به‌روزرسانی دیتابیس
    const connection = await pool.getConnection();
    try {
      const [result]: any = await connection.execute(
        'UPDATE users SET is_active = ? WHERE id = ?',
        [is_active, userId]
      );

      if (result.affectedRows === 0) {
        return NextResponse.json({ success: false, message: 'کاربر یافت نشد' }, { status: 404 });
      }

      const statusText = is_active ? "فعال" : "غیرفعال";
      return NextResponse.json({ success: true, message: `وضعیت کاربر با موفقیت به ${statusText} تغییر یافت` });
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.error(`Error updating user ${params.id} status:`, error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, message: 'داده ورودی نامعتبر است' }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: error.message || 'خطای سرور' }, { status: 500 });
  }
}
