'use client';

import React, { useState, useEffect, useRef, useCallback, ChangeEvent } from 'react';
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

// --- INTERFACES ---
interface ChatMessage {
  type: 'user' | 'ai';
  content: string;
  character?: string;
}

interface ServerMessage {
  type: string;
  content: string;
  character: string;
  timestamp: string;
  id: string;
}

// --- COMPONENT ---
const IndependenceAssessment = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [initialAiMessages, setInitialAiMessages] = useState<ServerMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [assessmentStarted, setAssessmentStarted] = useState(false);
  const [isIntroModalOpen, setIsIntroModalOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

<<<<<<< HEAD
  // --- TIMER LOGIC ---
  const [timeLeft, setTimeLeft] = useState(300);

  // --- SPEECH RECOGNITION ---
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
=======
  // --- TIMER STATE ---
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (assessmentStarted) {
      interval = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [assessmentStarted]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  const scenarioInfo = {
    category: "سناریوی استقلال در محیط کار",
    context: "شما در یک جلسه مهم برای تصمیم‌گیری درباره آینده یک محصول کلیدی شرکت دارید.",
    characters: [
      { name: 'آقای توحیدی', role: 'مدیر بخش', avatar: '👨‍💼' },
      { name: 'سارا', role: 'طراح تیم', avatar: '👩‍💻' },
      { name: 'احمد', role: 'مسئول کیفیت', avatar: '👨‍🔧' },
    ]
>>>>>>> fc0a3efc016a7685f72748af01323168e8fd0a3b
  };

  // --- EFFECTS ---
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (user) {
      startChatSession();
    } else {
      router.push('/login');
    }
  }, [user, router]);

  useEffect(() => {
    if (assessmentStarted && initialAiMessages.length > 0) {
      displayMessagesSequentially(initialAiMessages);
    }
  }, [assessmentStarted, initialAiMessages]);

<<<<<<< HEAD
  // --- TIMER FUNCTIONS ---
  const handleTimeUp = useCallback(async () => {
    if (!sessionId) {
      console.error("handleTimeUp called but sessionId is null.");
      toast.error("خطای داخلی: شناسه جلسه برای پایان ارزیابی یافت نشد.");
      return;
=======
  // --- FUNCTIONS ---
  const playNotification = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (err) {
      console.log('Notification sound not available:', err);
>>>>>>> fc0a3efc016a7685f72748af01323168e8fd0a3b
    }

    toast.info("⏰ زمان شما به پایان رسید. در حال تحلیل نهایی گفتگو...");
    setIsTyping(true);

    try {
      const response = await fetch('/api/ai-chat/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Server error during analysis');
      }

      toast.success("✅ تحلیل تکمیل شد. در حال انتقال به صفحه نتایج...");
      localStorage.setItem('independence_results', JSON.stringify(data.analysis));
      router.push('/results');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "یک خطای ناشناخته رخ داد";
      console.error("Error in handleTimeUp:", error);
      toast.error(`خطا در تحلیل نهایی: ${errorMessage}`);
      setIsTyping(false);
    }
  }, [sessionId, router]);

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

  // --- OTHER FUNCTIONS ---
  const displayMessagesSequentially = (msgs: ServerMessage[]) => {
    setIsTyping(true);
    let delay = 1000;
    msgs.forEach((msg, index) => {
      setTimeout(() => {
        if (index === msgs.length - 1) setIsTyping(false);
        setMessages((prev) => [...prev, { type: 'ai', content: msg.content, character: msg.character }]);
      }, delay);
      delay += 2000;
    });
  };

  const startChatSession = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ai-chat/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName: user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : 'کاربر'
        }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to start session');

      setSessionId(data.sessionId);
      const aiMessage = {
        type: 'ai',
        content: data.message,
        character: 'آقای احمدی',
        timestamp: data.timestamp,
        id: 'initial'
      };
      setInitialAiMessages([aiMessage]);
    } catch (error) {
      console.error('Error starting chat session:', error);
      toast.error("خطا در شروع ارزیابی. لطفاً صفحه را رفرش کنید.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || isTyping || !sessionId) return;

    const userMessage: ChatMessage = { type: 'user', content: currentMessage.trim() };
    setMessages(prev => [...prev, userMessage]);
    const messageToSend = currentMessage.trim();
    setCurrentMessage('');
    setIsTyping(true);

    try {
      const response = await fetch('/api/ai-chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
<<<<<<< HEAD
        body: JSON.stringify({ sessionId, message: messageToSend })
=======
        body: JSON.stringify({
          sessionId: sessionId,
          message: messageToSend
        })
>>>>>>> fc0a3efc016a7685f72748af01323168e8fd0a3b
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || data.message || 'Server error');
      handleServerResponse(data);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error("خطا در ارسال پیام.");
      setIsTyping(false);
    }
  };

  const handleServerResponse = (data: any) => {
<<<<<<< HEAD
    if (data.message) {
=======
    if (data.type === 'final_analysis') {
      toast.success("ارزیابی تکمیل شد. در حال انتقال به صفحه نتایج...");
      localStorage.setItem('independence_results', JSON.stringify({ final_analysis: data.analysis || data }));
      setTimeout(() => router.push('/results'), 1500);
    } else if (data.message) {
>>>>>>> fc0a3efc016a7685f72748af01323168e8fd0a3b
      const aiMessage: ChatMessage = {
        type: 'ai',
        content: data.message,
        character: 'آقای احمدی'
      };
      setMessages(prev => [...prev, aiMessage]);
<<<<<<< HEAD
=======
      playNotification();
      setIsTyping(false);
    } else if (data.messages && Array.isArray(data.messages)) {
      displayMessagesSequentially(data.messages);
    } else {
      setIsTyping(false);
>>>>>>> fc0a3efc016a7685f72748af01323168e8fd0a3b
    }
    setIsTyping(false);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><p>در حال بارگذاری سناریو...</p></div>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Toaster position="top-center" richColors />
      {/* Intro Modal */}
      <Dialog open={isIntroModalOpen && !loading}>
        <DialogContent className="sm:max-w-md bg-white/90 backdrop-blur-lg border-gray-200 rounded-2xl shadow-luxury">
          <DialogHeader className="text-center">
<<<<<<< HEAD
            <DialogTitle className="text-2xl font-bold text-gray-800">سناریوی استقلال در محیط کار</DialogTitle>
            <DialogDescription className="text-gray-600 pt-2 mx-auto max-w-sm">
              شما در یک جلسه مهم برای تصمیم‌گیری درباره آینده یک محصول کلیدی شرکت دارید.
            </DialogDescription>
=======
            <DialogTitle className="text-2xl font-bold text-gray-800">{scenarioInfo.category}</DialogTitle>
            <DialogDescription className="text-gray-600 pt-2 mx-auto max-w-sm">{scenarioInfo.context}</DialogDescription>
>>>>>>> fc0a3efc016a7685f72748af01323168e8fd0a3b
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => { setIsIntroModalOpen(false); setAssessmentStarted(true); }}
              className="w-full bg-blue-600 text-white hover:bg-blue-700 text-lg py-6"
            >
              شروع ارزیابی
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <header className="bg-white border-b p-4 sticky top-0 z-10">
<<<<<<< HEAD
        <div className="relative max-w-3xl mx-auto flex items-center justify-between">
=======
        <div className="max-w-3xl mx-auto flex items-center justify-between">
>>>>>>> fc0a3efc016a7685f72748af01323168e8fd0a3b
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-blue-600" />
            <h1 className="text-lg font-bold text-gray-800">جلسه ارزیابی استقلال</h1>
          </div>
<<<<<<< HEAD
          {assessmentStarted && (
            <div className="flex items-center gap-2 absolute left-1/2 -translate-x-1/2 text-xl font-bold text-red-600 tabular-nums">
              <Timer className="w-6 h-6" />
              {String(Math.floor(timeLeft / 60)).padStart(2, '0')}:{String(timeLeft % 60).padStart(2, '0')}
            </div>
          )}
=======

          {/* تایمر */}
          {assessmentStarted && (
            <div className="text-sm font-mono text-gray-600">
              ⏱ {formatTime(seconds)}
            </div>
          )}

>>>>>>> fc0a3efc016a7685f72748af01323168e8fd0a3b
          <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto p-4">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex items-end gap-3 ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.type !== 'user' && (
                <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-base font-bold shrink-0">
                  {msg.character?.charAt(0)}
                </div>
              )}
              <div className={`max-w-[85%] p-4 rounded-2xl shadow-sm ${msg.type === 'user'
                ? 'bg-blue-600 text-white rounded-br-none'
                : 'bg-white text-gray-800 border rounded-bl-none'
                }`}>
                {msg.character && msg.type !== 'user' && (
                  <p className="text-sm font-bold mb-1 text-gray-700">{msg.character}</p>
                )}
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
          {isTyping && <div className="text-sm text-gray-500 pl-12">در حال تایپ...</div>}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white/80 backdrop-blur-sm border-t p-4 sticky bottom-0">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3">
            <Textarea
              value={currentMessage}
<<<<<<< HEAD
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setCurrentMessage(e.target.value)}
              placeholder="پاسخ خود را بنویسید یا بگویید..."
              className="flex-1 rounded-full border-gray-300 px-4 py-2 resize-none"
              rows={1}
              disabled={isTyping || !assessmentStarted || timeLeft === 0}
            />
            <Button
              variant={isRecording ? "destructive" : "secondary"}
              onClick={toggleRecording}
              className="rounded-full w-12 h-12"
            >
              {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </Button>
            <Button
              onClick={handleSendMessage}
              disabled={isTyping || !currentMessage.trim() || timeLeft === 0}
              className="rounded-full w-12 h-12"
            >
=======
              onChange={(e) => setCurrentMessage(e.target.value)}
              placeholder="پاسخ خود را بنویسید..."
              className="flex-1 rounded-full border-gray-300 px-4 py-2 resize-none"
              rows={1}
              disabled={isTyping || !assessmentStarted}
            />
            <Button onClick={handleSendMessage} disabled={isTyping || !currentMessage.trim()} className="rounded-full w-12 h-12">
>>>>>>> fc0a3efc016a7685f72748af01323168e8fd0a3b
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default IndependenceAssessment;
