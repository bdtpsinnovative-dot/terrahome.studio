'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, User, Phone, Mail, ShieldCheck, CheckCircle2, Camera, X } from 'lucide-react';
import Cropper from 'react-easy-crop'; // ⚡ นำเข้าไลบรารีครอปรูป
import { createClient } from '@/src/supabase/client'; 

// ==========================================
// ⚡ ฟังก์ชันแปลงรูปที่ครอปให้เป็น WebP ขนาดจิ๋ว
// ==========================================
const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous'); 
    image.src = url;
  });

async function getCroppedImg(imageSrc: string, pixelCrop: any): Promise<Blob | null> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) return null;

  // ล็อกขนาดรูปให้เหลือแค่ 400x400 pixels เพื่อให้ไฟล์เล็กที่สุด
  const size = 400; 
  canvas.width = size;
  canvas.height = size;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    size,
    size
  );

  // แปลงเป็น WebP พร้อมปรับลด Quality เหลือ 0.7 (จะได้ไฟล์ประมาณ 10-30 KB)
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob);
    }, 'image/webp', 0.7);
  });
}
// ==========================================

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false); 
  const [message, setMessage] = useState({ type: '', text: '' });
  
  const [userAuth, setUserAuth] = useState<any>(null);
  const [profile, setProfile] = useState({ full_name: '', phone: '', email: '', avatar_url: '' });
  const [memberships, setMemberships] = useState({ is_wood_member: false, is_decor_member: false });

  // ⚡ State สำหรับหน้าต่างครอปรูป
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return;
      }

      setUserAuth(session.user);

      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (data && !error) {
        setProfile({
          full_name: data.full_name || '',
          phone: data.phone || '',
          email: data.email || session.user.email || '',
          avatar_url: data.avatar_url || session.user.user_metadata?.avatar_url || '',
        });
        setMemberships({
          is_wood_member: data.is_wood_member || false,
          is_decor_member: data.is_decor_member || false,
        });
      }
      setLoading(false);
    };

    loadProfile();
  }, [router, supabase]);

  // 1. ดักจับเมื่อผู้ใช้เลือกไฟล์รูป
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      const imageUrl = URL.createObjectURL(file);
      setImageToCrop(imageUrl); // เปิดหน้าต่างครอป
    }
    event.target.value = ''; // รีเซ็ต input เผื่อเลือกรุปเดิมซ้ำ
  };

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // 2. เมื่อกดปุ่ม "SAVE CROP" ให้เริ่มประมวลผล WebP และอัปโหลด
  const handleSaveCrop = async () => {
    if (!imageToCrop || !croppedAreaPixels || !userAuth) return;

    try {
      setUploading(true);
      setImageToCrop(null); // ปิดหน้าต่างครอป
      setMessage({ type: '', text: '' });

      // ดึง Blob ที่เป็น WebP ขนาดจิ๋วออกมา
      const croppedWebpBlob = await getCroppedImg(imageToCrop, croppedAreaPixels);
      if (!croppedWebpBlob) throw new Error('Failed to crop image');

      // ตั้งชื่อไฟล์ใหม่ บังคับนามสกุล .webp
      const fileName = `${userAuth.id}-${Date.now()}.webp`;

      // อัปโหลดขึ้น Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, croppedWebpBlob, {
          contentType: 'image/webp',
          upsert: true // อัปโหลดทับไฟล์เดิมถ้ามีชื่อซ้ำ
        });

      if (uploadError) throw uploadError;

      // ดึง URL มาแสดงผล
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      setProfile({ ...profile, avatar_url: publicUrl });

      // อัปเดตตาราง
      await supabase.from('customers').update({ avatar_url: publicUrl, updated_at: new Date().toISOString() }).eq('id', userAuth.id);
      await supabase.auth.updateUser({ data: { avatar_url: publicUrl } });

      setMessage({ type: 'success', text: 'Profile picture updated successfully!' });

    } catch (error: any) {
      console.error(error);
      setMessage({ type: 'error', text: 'Error uploading image. Please try again.' });
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    if (!userAuth) return;

    const { error } = await supabase
      .from('customers')
      .update({
        full_name: profile.full_name,
        phone: profile.phone,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userAuth.id);

    if (error) {
      setMessage({ type: 'error', text: 'Failed to update profile. Please try again.' });
    } else {
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      await supabase.auth.updateUser({ data: { full_name: profile.full_name } });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#EAE7E0] flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-2 border-[#3A3835]/10 border-t-[#84492C] rounded-full animate-spin mb-4"></div>
        <p className="text-[#8C8A86] text-[10px] uppercase tracking-[0.2em] animate-pulse">Loading Profile...</p>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-[#EAE7E0] text-[#3A3835] font-sans flex flex-col selection:bg-[#C8A97E]/20 pb-12 pt-24 md:pt-32">
        <div className="max-w-4xl w-full mx-auto px-6">
          <button onClick={() => router.back()} className="mb-8 text-[10px] sm:text-[11px] font-bold tracking-[0.2em] uppercase text-[#8C8A86] hover:text-[#84492C] flex items-center gap-2 transition-colors group cursor-pointer">
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" /> 
            <span>BACK</span>
          </button>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            
            {/* โซนซ้าย */}
            <div className="md:col-span-4 flex flex-col gap-6">
              <div className="bg-white p-8 shadow-[0_10px_40px_rgba(0,0,0,0.03)] rounded-[2px] flex flex-col items-center text-center border border-[#3A3835]/5">
                
                <div className="relative mb-4 group cursor-pointer">
                  <input type="file" id="avatar-upload" accept="image/*" className="hidden" onChange={handleFileChange} disabled={uploading}/>

                  <label htmlFor="avatar-upload" className="cursor-pointer block relative rounded-full overflow-hidden w-24 h-24 border-2 border-[#EAE7E0]">
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-[#F4F1EB] flex items-center justify-center text-[#8C8A86]">
                        <User className="w-10 h-10 opacity-50" />
                      </div>
                    )}
                    <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-300 ${uploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                      {uploading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        <Camera className="w-6 h-6 text-white" />
                      )}
                    </div>
                  </label>
                </div>

                <h2 className="font-serif text-lg uppercase tracking-widest text-[#3A3835] truncate w-full">
                  {profile.full_name || 'GUEST USER'}
                </h2>
                <p className="text-[10px] text-[#8C8A86] uppercase tracking-[0.1em] mt-1 w-full truncate">
                  {profile.email}
                </p>

                <div className="mt-6 w-full flex flex-col gap-2">
                  <div className={`p-3 border flex items-center justify-center gap-2 rounded-[2px] transition-colors ${memberships.is_wood_member ? 'border-[#84492C] bg-[#84492C]/5 text-[#84492C]' : 'border-[#3A3835]/10 text-[#8C8A86] bg-[#F9F8F6]'}`}>
                    <ShieldCheck className="w-4 h-4" />
                    <span className="text-[9px] uppercase tracking-[0.15em] font-bold">Wood Member {memberships.is_wood_member && '✓'}</span>
                  </div>
                  <div className={`p-3 border flex items-center justify-center gap-2 rounded-[2px] transition-colors ${memberships.is_decor_member ? 'border-[#84492C] bg-[#84492C]/5 text-[#84492C]' : 'border-[#3A3835]/10 text-[#8C8A86] bg-[#F9F8F6]'}`}>
                    <ShieldCheck className="w-4 h-4" />
                    <span className="text-[9px] uppercase tracking-[0.15em] font-bold">Decor Member {memberships.is_decor_member && '✓'}</span>
                  </div>
                </div>

              </div>
            </div>

            {/* โซนขวา */}
            <div className="md:col-span-8">
              <div className="bg-white p-8 md:p-12 shadow-[0_10px_40px_rgba(0,0,0,0.03)] rounded-[2px] border border-[#3A3835]/5">
                <div className="mb-8 border-b border-[#3A3835]/10 pb-6">
                  <h1 className="font-serif text-2xl uppercase tracking-widest text-[#3A3835]">PERSONAL DETAILS</h1>
                  <p className="text-[11px] uppercase tracking-[0.15em] text-[#8C8A86] mt-2">Update your contact information</p>
                </div>

                {message.text && (
                  <div className={`mb-6 p-4 text-[10px] uppercase tracking-wider text-center rounded-[2px] flex items-center justify-center gap-2 ${message.type === 'success' ? 'bg-[#F2EFE9] text-[#84492C] border border-[#84492C]/20' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                    {message.type === 'success' && <CheckCircle2 className="w-4 h-4" />}
                    {message.text}
                  </div>
                )}

                <form onSubmit={handleUpdateProfile} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#8C8A86] ml-1 flex items-center gap-1.5"><User className="w-3 h-3" /> Full Name</label>
                      <input type="text" value={profile.full_name} onChange={(e) => setProfile({...profile, full_name: e.target.value})} className="w-full bg-[#F9F8F6] border border-[#3A3835]/10 px-4 py-3.5 text-sm focus:outline-none focus:border-[#84492C] focus:bg-white transition-colors rounded-[2px]" placeholder="Your Full Name" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#8C8A86] ml-1 flex items-center gap-1.5"><Phone className="w-3 h-3" /> Phone Number</label>
                      <input type="tel" value={profile.phone} onChange={(e) => setProfile({...profile, phone: e.target.value})} className="w-full bg-[#F9F8F6] border border-[#3A3835]/10 px-4 py-3.5 text-sm focus:outline-none focus:border-[#84492C] focus:bg-white transition-colors rounded-[2px]" placeholder="+66 8X XXX XXXX" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#8C8A86] ml-1 flex items-center gap-1.5"><Mail className="w-3 h-3" /> Email Address</label>
                    <input type="email" value={profile.email} disabled className="w-full bg-[#EAE7E0]/50 border border-[#3A3835]/5 px-4 py-3.5 text-sm text-[#8C8A86] cursor-not-allowed rounded-[2px]" />
                    <p className="text-[9px] text-[#8C8A86] ml-1 mt-1">Email cannot be changed directly.</p>
                  </div>

                  <div className="pt-4 border-t border-[#3A3835]/10 mt-8 flex justify-end">
                    <button type="submit" disabled={saving} className="bg-[#3A3835] text-white px-8 py-3.5 text-[10px] uppercase font-bold tracking-[0.2em] hover:bg-[#84492C] transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed rounded-[2px] min-w-[140px]">
                      {saving ? 'SAVING...' : 'SAVE CHANGES'}
                    </button>
                  </div>
                </form>

              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* ⚡ หน้าต่าง Pop-up สำหรับครอปรูป (Modal) */}
      {/* ========================================== */}
      {imageToCrop && (
        <div className="fixed inset-0 z-[9999] bg-black/90 flex flex-col items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-white rounded-sm overflow-hidden flex flex-col shadow-2xl">
            
            {/* หัว Modal */}
            <div className="flex justify-between items-center p-4 border-b border-[#3A3835]/10 bg-white">
              <h3 className="text-[#3A3835] text-[11px] font-bold tracking-[0.15em] uppercase">ADJUST PROFILE PICTURE</h3>
              <button onClick={() => setImageToCrop(null)} className="text-[#8C8A86] hover:text-red-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* พื้นที่สำหรับครอปรูป */}
            <div className="relative w-full h-[350px] sm:h-[450px] bg-[#121212]">
              <Cropper
                image={imageToCrop}
                crop={crop}
                zoom={zoom}
                aspect={1}          // บังคับให้เป็นสัดส่วน 1:1 (สี่เหลี่ยมจัตุรัส)
                cropShape="round"   // โชว์กรอบเป็นวงกลมให้เห็นชัดเจน
                showGrid={false}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>

            {/* ตัวเลื่อนซูม & ปุ่ม Save */}
            <div className="p-6 bg-white flex flex-col gap-6">
              <div className="flex items-center gap-4">
                <span className="text-[10px] text-[#8C8A86] font-bold">ZOOM</span>
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  aria-labelledby="Zoom"
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full accent-[#84492C]"
                />
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setImageToCrop(null)}
                  className="flex-1 py-3 text-[10px] uppercase font-bold tracking-[0.2em] text-[#3A3835] border border-[#3A3835]/20 hover:bg-[#F9F8F6] transition-colors rounded-[2px]"
                >
                  CANCEL
                </button>
                <button 
                  onClick={handleSaveCrop}
                  className="flex-1 bg-[#84492C] text-white py-3 text-[10px] uppercase font-bold tracking-[0.2em] hover:bg-[#3A3835] transition-colors rounded-[2px]"
                >
                  SAVE CROP
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
}