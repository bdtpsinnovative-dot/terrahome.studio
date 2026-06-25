"use client";

import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Scanner } from '@yudiel/react-qr-scanner'; 

// 1. ตั้งค่า Supabase 
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function SysDiagPage() {
  const [productData, setProductData] = useState<any>(null);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // 2. ฟังก์ชันค้นหาสินค้า พร้อมดึงสต็อกและชื่อสาขา
  const searchProduct = async (codeToSearch: string) => {
    if (!codeToSearch.trim()) return;
    
    setLoading(true);
    setError(null);
    setProductData(null);
    setIsScannerOpen(false); // สแกนติดปุ๊บ ปิดกล้องทันที

    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id, barcode, sku, name, image_url, price,
          stock (
            qty,
            branches (
              branch_name
            )
          )
        `)
        .eq('barcode', codeToSearch.trim()) 
        .single();

      if (error || !data) {
        setError("ไม่พบข้อมูลสินค้า บาร์โค้ด: " + codeToSearch);
      } else {
        setProductData(data);
        setInputValue(""); 
      }
    } catch (err) {
      console.error(err);
      setError("ระบบค้นหามีปัญหาครับ");
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    searchProduct(inputValue);
  };

  // ฟังก์ชันรับค่าจากกล้อง
  const handleRealScan = (detectedCodes: any[]) => {
    if (detectedCodes && detectedCodes.length > 0) {
      const code = detectedCodes[0].rawValue; 
      searchProduct(code);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center pt-10 px-4 font-sans pb-20">
      
      <style dangerouslySetInnerHTML={{ __html: `
        nav, header, .navbar { display: none !important; }
        
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.4s ease-out forwards;
        }

        @keyframes border-beam {
          100% { offset-distance: 100%; }
        }
      `}} />

      {/* --- โซนที่ 1: ช่องค้นหามินิมอล --- */}
      <form 
        onSubmit={handleManualSubmit} 
        className="w-full max-w-2xl bg-white border border-gray-200 rounded-2xl p-2 flex items-center shadow-lg sticky top-6 z-30"
      >
        <div className="pl-3 pr-2 text-gray-400">
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h2m-2 4h2m-2 4h2m-2 4h2m4-12h2m-2 4h2m-2 4h2m-2 4h2m4-12h2m-2 4h2m-2 4h2m-2 4h2M4 4v16m16-16v16" />
          </svg>
        </div>
        
        <input 
          type="text" 
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="ยิงบาร์โค้ด หรือสแกน ->"
          className="flex-1 bg-transparent outline-none text-gray-800 placeholder-gray-400 py-3 px-3 text-xl font-semibold"
          autoFocus
        />

        <button 
          type="button"
          onClick={() => setIsScannerOpen(true)}
          className="bg-[#1B253A] hover:bg-[#2c3954] text-white p-4 rounded-xl transition-colors flex items-center justify-center shadow"
        >
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </form>

      {/* แจ้งเตือนสถานะ */}
      {loading && <p className="mt-6 text-blue-600 font-medium animate-pulse">กำลังค้นหาข้อมูลสินค้า...</p>}
      {error && <div className="mt-6 p-4 bg-red-50 text-red-700 font-bold rounded-2xl border border-red-200 animate-fade-in">{error}</div>}

      {/* --- โซนที่ 2: แสดงผลลัพธ์ --- */}
      {productData && !loading && (
        <div className="w-full max-w-2xl mt-8 animate-fade-in relative p-[2px] overflow-hidden rounded-3xl">
          
          <div className="absolute inset-0 z-0">
            <div style={{
              position: 'absolute', width: '100%', height: '100%',
              background: 'linear-gradient(90deg, transparent, #3b82f6, transparent)',
              borderRadius: '1.5rem', offsetPath: 'rect(0% 100% 100% 0% round 1.5rem)',
              animation: 'border-beam 3s infinite linear', visibility: 'visible',
            }} />
          </div>

          <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100 flex flex-col md:flex-row gap-8 items-center md:items-start relative z-10">
            
            <div className="w-48 h-48 flex-shrink-0 bg-gray-50 rounded-2xl overflow-hidden border border-gray-100 shadow-inner flex items-center justify-center">
              {productData.image_url ? (
                <img src={productData.image_url} alt={productData.name} title={productData.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300 flex-col gap-2">
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  NO IMAGE
                </div>
              )}
            </div>

            <div className="flex-1 w-full text-center md:text-left">
              <p className="text-gray-400 text-xs font-mono mb-1 tracking-widest uppercase">BARCODE: {productData.barcode}</p>
              <h2 className="text-[#1B253A] text-3xl font-extrabold mb-2 leading-tight">{productData.name}</h2>
              {productData.sku && <p className="text-gray-500 text-sm mb-5 font-medium">SKU: {productData.sku}</p>}
              
              <div className="flex flex-col md:flex-row md:items-end gap-6 mb-6">
                <p className="text-blue-600 font-black text-5xl">
                  ฿ {productData.price ? productData.price.toLocaleString(undefined, {minimumFractionDigits: 2}) : "0.00"}
                </p>
                
                <div className="bg-gray-100 px-4 py-2 rounded-full text-sm font-bold text-gray-700 inline-flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20"><path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" /></svg>
                    สต็อกรวม: {productData.stock ? productData.stock.reduce((sum: number, s: any) => sum + (s.qty || 0), 0).toLocaleString() : 0} ชิ้น
                </div>
              </div>

              <div className="w-full bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-100 bg-gray-100/50">
                      <h4 className="text-[#1B253A] font-bold text-sm tracking-wide uppercase flex items-center gap-2">
                        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                        สถานะสต็อกแยกสาขา
                      </h4>
                  </div>
                  <div className="p-2 flex flex-col gap-1.5">
                    {productData.stock && productData.stock.length > 0 ? (
                        productData.stock.map((s: any, index: number) => (
                            <div key={index} className="flex items-center justify-between bg-white px-4 py-2.5 rounded-lg border border-gray-100 shadow-sm">
                                <span className="text-gray-700 font-medium text-sm">{s.branches?.branch_name || 'ไม่ระบุสาขา'}</span>
                                <div className={`px-3 py-1 rounded-full font-bold text-xs ${s.qty > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                    {s.qty ? s.qty.toLocaleString() : 0} ชิ้น
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-center text-gray-500 py-4 text-sm">ไม่มีข้อมูลสต็อกในแต่ละสาขา</p>
                    )}
                  </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- โซนที่ 3: Popup สแกนกล้อง --- */}
      {isScannerOpen && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden flex flex-col shadow-2xl">
            
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-2.5 text-[#1B253A] font-bold text-lg">
                <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                สแกนบาร์โค้ดสินค้า
              </div>
              <button onClick={() => setIsScannerOpen(false)} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-500 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* พื้นที่แสดงกล้อง */}
            <div className="w-full h-[400px] bg-black relative flex items-center justify-center overflow-hidden">
              <Scanner 
                onScan={handleRealScan} 
                formats={['qr_code', 'ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e']}
                components={{
                    // 🌟 ลบบรรทัด audio: false ออกไปแล้วครับนาย Build ผ่านแน่นอนครับ
                    finder: false, 
                }}
                styles={{
                    container: { width: '100%', height: '100%' },
                }}
              />
              
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
                 <div className="w-3/4 h-32 border-2 border-blue-500 rounded-lg shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
              </div>
              
              <div className="pointer-events-none" style={{
                position: 'absolute', left: 0, width: '100%', height: '2px', background: '#3b82f6',
                boxShadow: '0 0 10px 2px rgba(59,130,246,0.7)', zIndex: 10, animation: 'scan-line 2.5s ease-in-out infinite'
              }}></div>
              <style dangerouslySetInnerHTML={{ __html: `
                @keyframes scan-line {
                  0% { top: 20%; } 50% { top: 80%; } 100% { top: 20%; }
                }
              `}} />
            </div>

            <div className="p-5 text-center bg-gray-50 text-[#1B253A] font-semibold border-t border-gray-100">
              หันกล้องไปที่บาร์โค้ดของสินค้าให้ตรงกรอบ
            </div>
            
          </div>
        </div>
      )}

    </div>
  );
}