// فایل کامل: mani-agah-esmaeilzad/test/src/lib/auth.ts
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

// ✅ راه‌حل جایگزین: محاسبه دستی زمان انقضا و قرار دادن آن در payload
export const generateToken = (
  userId: number, 
  username: string, 
  role: 'user' | 'admin' = 'user', 
  expiresInSeconds: number = 7 * 24 * 60 * 60 // 7 days in seconds
) => {
  const iat = Math.floor(Date.now() / 1000); // Issued at
  const exp = iat + expiresInSeconds;       // Expiration time

  const payload = { 
    userId, 
    username, 
    role,
    iat,
    exp 
  };
  
  // دیگر از آپشن expiresIn استفاده نمی‌کنیم
  return jwt.sign(payload, JWT_SECRET);
};

export const authenticateToken = (token: string): any => {
  try {
    // تابع verify به صورت خودکار زمان انقضای (exp) داخل payload را چک می‌کند
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('توکن نامعتبر یا منقضی شده است');
  }
};

export const extractTokenFromHeader = (header: string | null | undefined): string | null => {
  if (!header || !header.startsWith('Bearer ')) {
    return null;
  }
  return header.substring(7);
};