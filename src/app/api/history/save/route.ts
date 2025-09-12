// File: src/app/api/history/save/route.ts

import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { messages, type } = body;

    if (!messages || !Array.isArray(messages) || !type) {
      return NextResponse.json({ message: 'Invalid data format' }, { status: 400 });
    }

    const filePath = path.join(process.cwd(), 'data', 'chat-history.json');
    let history = [];

    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      history = JSON.parse(fileContent);
    }

    const newChat = {
      id: uuidv4(),
      type,
      timestamp: new Date().toISOString(),
      messages,
    };

    history.push(newChat);

    fs.writeFileSync(filePath, JSON.stringify(history, null, 2), 'utf-8');

    return NextResponse.json({ message: 'Chat saved successfully', chatId: newChat.id }, { status: 201 });

  } catch (error) {
    console.error('Error saving chat history:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
