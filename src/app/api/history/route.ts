// File: src/app/api/history/route.ts

import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'data', 'chat-history.json');
    if (!fs.existsSync(filePath)) {
      // If the file doesn't exist, return an empty array
      return NextResponse.json([]);
    }
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const history = JSON.parse(fileContent);
    return NextResponse.json(history);
  } catch (error) {
    console.error('Error fetching chat history:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
