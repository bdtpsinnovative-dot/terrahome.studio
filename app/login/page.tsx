'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/src/supabase/client'; // ⚡ เช็ค Path ให้ตรงกับโปรเจกต์นายนะครับ

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      if (isSignUp) {
        // โหมด: สมัครสมาชิก
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (authError) throw authError;

        if (authData.user) {
          const { error: dbError } = await supabase
            .from('profiles')
            .upsert({
              user_id: authData.user.id,
              email: email,
              full_name: fullName,
              role: 'customer',
            });

          if (dbError) {
            console.error("Error saving profile:", dbError);
            throw new Error("สร้างโปรไฟล์ลูกค้าไม่สำเร็จ");
          }
        }

        alert('Registration Successful! Please sign in.');
        setIsSignUp(false);
        setPassword('');

      } else {
        // โหมด: เข้าสู่ระบบ
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        // ล็อกอินสำเร็จ พากลับหน้า Home
        router.push('/');
        router.refresh(); 
      }
    } catch (error: any) {
      setErrorMsg(error.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    // 🌟 ดันเนื้อหาลงมาด้วย pt-32 เพื่อหลบ Navbar ตัวหลักที่มาจาก layout.tsx
    <div className="min-h-screen bg-[#EAE7E0] text-[#3A3835] font-sans flex flex-col selection:bg-[#C8A97E]/20 pt-32 pb-12">
      
      {/* ❌ ลบ <nav> เดิมที่เคยซ้อนกันออกไปแล้ว ❌ */}

      <div className="flex-1 flex items-start justify-center px-4 mt-8">
        <div className="w-full max-w-md relative animate-fade-in-up">
          
          {/* 🌟 ย้ายปุ่ม BACK มาไว้ด้านบนกล่อง Login แทน จะได้ไม่ชนกับเมนูหลัก */}
          <button 
            onClick={() => router.back()} 
            className="mb-6 text-[10px] sm:text-[11px] font-bold tracking-[0.2em] uppercase text-[#8C8A86] hover:text-[#84492C] flex items-center gap-2 transition-colors group cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" /> 
            <span>BACK</span>
          </button>

          {/* กล่อง Login */}
          <div className="bg-white p-8 md:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.05)] rounded-[2px]">
            
            <div className="text-center mb-10">
              <h1 className="font-serif text-2xl lg:text-3xl uppercase tracking-widest text-[#3A3835] mb-2">
                {isSignUp ? 'CREATE ACCOUNT' : 'WELCOME BACK'}
              </h1>
              <p className="text-[11px] uppercase tracking-[0.15em] text-[#8C8A86]">
                {isSignUp ? 'Join Terra Home Studio' : 'Sign in to access your collections'}
              </p>
            </div>

            {errorMsg && (
              <div className="mb-6 p-3 bg-red-50 border border-red-100 text-red-600 text-[11px] uppercase tracking-wider text-center rounded-sm">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-5">
              
              {isSignUp && (
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#8C8A86] ml-1">Full Name</label>
                  <input 
                    type="text" 
                    required={isSignUp}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-[#F9F8F6] border border-[#3A3835]/10 px-4 py-3 text-sm focus:outline-none focus:border-[#84492C] focus:bg-white transition-colors rounded-[2px]"
                    placeholder="Your Name"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#8C8A86] ml-1">Email Address</label>
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#F9F8F6] border border-[#3A3835]/10 px-4 py-3 text-sm focus:outline-none focus:border-[#84492C] focus:bg-white transition-colors rounded-[2px]"
                  placeholder="email@example.com"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#8C8A86] ml-1">Password</label>
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#F9F8F6] border border-[#3A3835]/10 px-4 py-3 text-sm focus:outline-none focus:border-[#84492C] focus:bg-white transition-colors rounded-[2px]"
                  placeholder="••••••••"
                  minLength={6}
                />
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-[#3A3835] text-white py-4 mt-4 text-[10px] uppercase font-bold tracking-[0.2em] hover:bg-[#84492C] transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed rounded-[2px]"
              >
                {loading ? 'PROCESSING...' : (isSignUp ? 'SIGN UP' : 'SIGN IN')}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-[#3A3835]/10 text-center">
              <p className="text-[11px] text-[#8C8A86] tracking-wide">
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                <button 
                  type="button"
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setErrorMsg('');
                  }}
                  className="ml-2 font-bold text-[#3A3835] hover:text-[#84492C] uppercase tracking-[0.1em] transition-colors"
                >
                  {isSignUp ? 'Sign In' : 'Create One'}
                </button>
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}