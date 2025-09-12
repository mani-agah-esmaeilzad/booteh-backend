// File: src/app/page.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, HeartHandshake, Star, Edit, Scale, LogOut, ChevronRight } from 'lucide-react';
import { toast, Toaster } from 'sonner';

const HomePage = () => {
  const router = useRouter();
  const { user, setUser } = useAuth();
  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setIsMounted(true);
    setLoading(false);
  }, []);
  
  const handleLogout = () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (setUser) {
          setUser(null);
      }
      toast.success("با موفقیت خارج شدید.");
      router.push('/login');
  };

  if (!isMounted || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-700">در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (isMounted) {
      router.push('/login');
    }
    return null;
  }

  const questionnaires = [
    {
      id: 1,
      title: "ارزیابی استقلال",
      description: "سنجش میزان استقلال و خودکفایی شما در تصمیم‌گیری‌ها",
      icon: Shield,
      color: "from-blue-500 to-indigo-600",
      bgColor: "from-blue-50 to-indigo-100",
      path: "/independence"
    },
    {
      id: 3,
      title: "تعادل کار و زندگی",
      description: "سنجش نگرش شما به مرز بین کار و زندگی با گفتگوی هوشمند",
      icon: HeartHandshake,
      color: "from-green-500 to-teal-600",
      bgColor: "from-green-50 to-teal-100",
      path: "/wlb"
    },
    {
      id: 5,
      title: "اعتماد به نفس",
      description: "سنجش میزان اعتماد به نفس و قاطعیت شما در محیط کاری",
      icon: Star,
      color: "from-pink-500 to-rose-600",
      bgColor: "from-pink-50 to-rose-100",
      path: "/confidence"
    },
    {
      id: 6,
      title: "مهارت‌های مذاکره",
      description: "سنجش توانایی شما در مذاکره و رسیدن به توافق در یک سناریو",
      icon: Scale,
      color: "from-indigo-500 to-purple-600",
      bgColor: "from-indigo-50 to-purple-100",
      path: "/negotiation"
    },
    {
      id: 2,
      title: "خودارزیابی مهارت‌های نرم",
      description: "یک پرسشنامه ۲۲ سوالی برای سنجش مهارت‌های نرم شما",
      icon: Edit,
      color: "from-yellow-500 to-amber-600",
      bgColor: "from-yellow-50 to-amber-100",
      path: "/soft-skills-q"
    }
  ];

  const handleStartAssessment = (path: string) => {
    toast.info("در حال آماده‌سازی آزمون...");
    router.push(path);
  };

  return (
    <>
      <Toaster position="top-center" richColors />
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8 rtl">
        <div className="max-w-4xl mx-auto">
          <header className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
                خوش آمدید، {user.first_name || 'کاربر'}!
              </h1>
              <p className="text-gray-500 mt-1">آزمون مورد نظر خود را انتخاب کنید.</p>
            </div>
            <Button variant="ghost" onClick={handleLogout} className="text-gray-600 hover:text-red-500">
              <LogOut className="w-5 h-5 ml-2" />
              خروج
            </Button>
          </header>

          <main className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {questionnaires.map((q) => (
              <Card
                key={q.id}
                className={`overflow-hidden transition-transform transform hover:scale-105 hover:shadow-xl cursor-pointer bg-gradient-to-br ${q.bgColor}`}
                onClick={() => handleStartAssessment(q.path)}
              >
                <CardHeader className="flex flex-row items-center gap-4 p-6">
                  <div className={`p-3 rounded-full bg-gradient-to-br ${q.color}`}>
                    <q.icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold text-gray-900">{q.title}</CardTitle>
                    <CardDescription className="text-gray-600">{q.description}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                  <Button className="w-full bg-white text-gray-800 shadow-sm hover:bg-gray-100">
                    شروع آزمون
                    <ChevronRight className="w-4 h-4 mr-2" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </main>
        </div>
      </div>
    </>
  );
};

export default HomePage;
