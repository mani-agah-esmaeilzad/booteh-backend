// File: src/app/confidence/page.tsx

'use client';

import React, { useState, useEffect, useCallback, useRef, ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Send, Users, Timer, Mic, MicOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { toast, Toaster } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ChatMessage {
  type: 'user' | 'ai';
  content: string;
  character?: string;
}

const ConfidenceAssessmentPage = () => {
    const router = useRouter();
    const { user } = useAuth();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [currentMessage, setCurrentMessage] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [loading, setLoading] = useState(true);
    const [chatId, setChatId] = useState<number | null>(null);
    const [assessmentStarted, setAssessmentStarted] = useState(false);
    const [isIntroModalOpen, setIsIntroModalOpen] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [timeLeft, setTimeLeft] = useState(300); // 5 minutes

    const [isRecording, setIsRecording] = useState(false);
    const recognitionRef = useRef<SpeechRecognition | null>(null);

    const toggleRecording = () => {
      if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
        toast.error("مرورگر شما از ضبط صدا پشتیبانی نمی‌کند.");
        return;
      }

      if (!recognitionRef.current) {
        const SpeechRecognition =
          (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.lang = "fa-IR"; // زبان فارسی
        recognition.interimResults = true; // نمایش همزمان متن
        recognition.maxAlternatives = 1;

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          let transcript = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          setCurrentMessage(transcript); // متن وارد textarea شود
        };

        recognition.onerror = (event) => {
          console.error("Speech recognition error:", event.error);
          toast.error("خطا در ضبط صدا");
          setIsRecording(false);
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognitionRef.current = recognition;
      }

      if (!isRecording) {
        recognitionRef.current.start();
        setIsRecording(true);
        toast.info("🎙️ در حال گوش دادن...");
      } else {
        recognitionRef.current.stop();
        setIsRecording(false);
      }
    };


    const scenarioInfo = {
        category: "ارزیابی اعتماد به نفس",
        context: "در این سناریو، با خانم امیری، مشاور توسعه فردی، در مورد دیدگاهتان نسبت به توانایی‌های حرفه‌ای خود گفتگو خواهید کرد.",
        characters: [{ name: 'خانم امیری', role: 'مشاور توسعه فردی', avatar: '👩‍🏫' }]
    };

    const handleTimeUp = useCallback(async () => {
        if (!chatId) return;

        toast.info("زمان شما به پایان رسید. در حال تحلیل نهایی گفتگو...");
        setIsTyping(true);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/assessment/finish-confidence', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ chatId }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Server error');

            toast.success("تحلیل تکمیل شد. در حال انتقال به صفحه نتایج...");
            localStorage.setItem('confidence_results', JSON.stringify(data.analysis));
            router.push('/results');
        } catch (error) {
            const msg = error instanceof Error ? error.message : "خطای ناشناخته";
            toast.error(`خطا در تحلیل نهایی: ${msg}`);
            setIsTyping(false);
        }
    }, [chatId, router]);
    
    useEffect(() => {
        if (!assessmentStarted || timeLeft <= 0) return;
        const timerId = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
        return () => clearTimeout(timerId);
    }, [timeLeft, assessmentStarted]);

    useEffect(() => {
        if (timeLeft === 0 && assessmentStarted) {
            handleTimeUp();
        }
    }, [timeLeft, assessmentStarted, handleTimeUp]);

    useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        const startSession = async () => {
            if (!user) {
                router.push('/login');
                return;
            }
            setLoading(true);
            try {
                const token = localStorage.getItem('token');
                const response = await fetch('/api/assessment/start-confidence', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await response.json();
                if (!data.success) throw new Error(data.message || "Failed to start session.");

                setChatId(data.chatId);
                if (data.initialMessages && Array.isArray(data.initialMessages)) {
                    const initialMessages = data.initialMessages.map((msg: any) => ({
                        type: 'ai',
                        content: msg.text,
                        character: 'خانم امیری'
                    }));
                    setMessages(initialMessages);
                }
            } catch (error) {
                const msg = error instanceof Error ? error.message : "خطای ناشناخته";
                toast.error(`خطا در شروع ارزیابی: ${msg}`);
            } finally {
                setLoading(false);
            }
        };
        startSession();
    }, [user, router]);

    const handleSendMessage = async () => {
        if (!currentMessage.trim() || isTyping || !chatId) return;

        const userMessage: ChatMessage = { type: 'user', content: currentMessage.trim(), character: 'شما' };
        setMessages(prev => [...prev, userMessage]);
        const messageToSend = currentMessage.trim();
        setCurrentMessage('');
        setIsTyping(true);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/assessment/chat-confidence', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ message: messageToSend, chatId })
            });
            const data = await response.json();
            if (!data.success) throw new Error(data.message || 'Server error');
            
            if (data.reply) {
                const aiMessage: ChatMessage = { type: 'ai', content: data.reply, character: 'خانم امیری' };
                setMessages(prev => [...prev, aiMessage]);
            }
        } catch (error) {
            toast.error("خطا در ارسال پیام.");
        } finally {
            setIsTyping(false);
        }
    };
    
    if (loading) {
        return <div className="min-h-screen flex items-center justify-center"><p>در حال بارگذاری سناریو...</p></div>;
    }

    return (
        <div className="min-h-screen flex flex-col bg-gray-50 rtl">
          <Toaster position="top-center" richColors />
          <Dialog open={isIntroModalOpen && !loading}>
            <DialogContent className="sm:max-w-md bg-white/90 backdrop-blur-lg border-gray-200 rounded-2xl shadow-luxury">
              <DialogHeader className="text-center">
                <DialogTitle className="text-2xl font-bold text-gray-800">{scenarioInfo.category}</DialogTitle>
                <DialogDescription className="text-gray-600 pt-2 mx-auto max-w-sm">{scenarioInfo.context}</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button onClick={() => { setIsIntroModalOpen(false); setAssessmentStarted(true); }} className="w-full bg-pink-600 text-white hover:bg-pink-700 text-lg py-6">
                  شروع گفتگو
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
    
          <header className="bg-white border-b p-4 sticky top-0 z-10">
            <div className="relative max-w-3xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="w-6 h-6 text-pink-600" />
                <h1 className="text-lg font-bold text-gray-800">ارزیابی اعتماد به نفس</h1>
              </div>
    
              {assessmentStarted && (
                <div className="flex items-center gap-2 absolute left-1/2 -translate-x-1/2 text-xl font-bold text-red-600 tabular-nums">
                    <Timer className="w-6 h-6" />
                    {String(Math.floor(timeLeft / 60)).padStart(2, '0')}:{String(timeLeft % 60).padStart(2, '0')}
                </div>
              )}
    
              <Button variant="ghost" size="icon" onClick={() => router.push('/')}><ArrowLeft className="w-5 h-5" /></Button>
            </div>
          </header>
    
          <main className="flex-1 overflow-y-auto p-4">
            <div className="max-w-3xl mx-auto space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className={`flex items-end gap-3 ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.type === 'ai' && <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-base font-bold shrink-0">{msg.character?.charAt(0)}</div>}
                  <div className={`max-w-[85%] p-4 rounded-2xl shadow-sm ${msg.type === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white text-gray-800 border rounded-bl-none'}`}>
                    {msg.character && <p className="text-sm font-bold mb-1 text-gray-700">{msg.character}</p>}
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                  {msg.type === 'user' && <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-base font-bold shrink-0">ش</div>}
                </div>
              ))}
              {isTyping && <div className="text-sm text-gray-500 pr-12 text-right">خانم امیری در حال تایپ...</div>}
              <div ref={messagesEndRef} />
            </div>
          </main>
    
          <footer className="bg-white/80 backdrop-blur-sm border-t p-4 sticky bottom-0">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center gap-3">
                <Textarea value={currentMessage} onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setCurrentMessage(e.target.value)} placeholder="پاسخ خود را بنویسید..." className="flex-1 rounded-full border-gray-300 px-4 py-2 resize-none" rows={1} disabled={isTyping || !assessmentStarted || timeLeft === 0} />
                <Button
                    variant={isRecording ? "destructive" : "secondary"}
                    onClick={toggleRecording}
                    className="rounded-full w-12 h-12"
                    >
                    {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </Button>
                <Button onClick={handleSendMessage} disabled={isTyping || !currentMessage.trim() || timeLeft === 0} className="rounded-full w-12 h-12"><Send className="w-5 h-5" /></Button>
              </div>
            </div>
          </footer>
        </div>
      );
};

export default ConfidenceAssessmentPage;
