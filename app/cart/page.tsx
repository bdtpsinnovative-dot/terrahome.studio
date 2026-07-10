'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Trash2, Minus, Plus, ShoppingBag, AlertCircle } from 'lucide-react';
import { createClient } from '@/src/supabase/client'; 

// ⚡ อัปเดต Type ให้รองรับข้อมูล Stock และ Collection Group
type CartItem = {
  id: string;
  quantity: number;
  product_id: number;
  products: {
    id: number;
    name: string;
    sku: string;
    price: number;
    image_url: string;
    collection_group_id: string;
    collection_groups?: {
      name: string;
      product_sup: string;
      tag?: string;
    };
    stock?: {
      qty: number;
    }[];
  };
};

export default function CartPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [userAuth, setUserAuth] = useState<any>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    const loadCart = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return;
      }

      setUserAuth(session.user);

      // ⚡ ดึงข้อมูล Cart + Products + Collection Groups + Stock ครบทุกตาราง
      const { data, error } = await supabase
        .from('cart_items')
        .select(`
          id,
          quantity,
          product_id,
          products!inner (
            id, name, sku, price, image_url, collection_group_id,
            collection_groups!inner (
              name,
              product_sup,
              tag
            ),
            stock (
              qty
            )
          )
        `)
        .eq('user_id', session.user.id)
        .ilike('products.collection_groups.tag', '%prop%')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching cart:", error);
      } else {
        // @ts-ignore
        setCartItems(data || []);
      }
      
      setLoading(false);
    };

    loadCart();
  }, [router, supabase]);

  // ฟังก์ชันคำนวณสต็อกรวมทุกสาขา
  const getTotalStock = (item: CartItem) => {
    if (!item.products.stock) return 0;
    return item.products.stock.reduce((sum, s) => sum + Number(s.qty), 0);
  };

  const handleUpdateQuantity = async (item: CartItem, delta: number) => {
    const currentQty = item.quantity;
    const newQty = currentQty + delta;
    const totalStock = getTotalStock(item);

    // ป้องกันการกดลดจนต่ำกว่า 1 หรือ กดเพิ่มจนเกินสต็อกที่มี
    if (newQty < 1) return;
    if (newQty > totalStock) {
      alert(`ไม่สามารถเพิ่มจำนวนได้ สินค้านี้มีสต็อกคงเหลือ ${totalStock} ชิ้นครับ`);
      return;
    }

    setUpdatingId(item.id);
    
    // อัปเดต UI ทันที
    setCartItems(prev => prev.map(cartItem => 
      cartItem.id === item.id ? { ...cartItem, quantity: newQty } : cartItem
    ));

    // ส่งคำสั่งอัปเดตไปที่ Supabase
    const { error } = await supabase
      .from('cart_items')
      .update({ quantity: newQty })
      .eq('id', item.id);

    if (error) {
      console.error("Error updating quantity:", error);
      // ถ้ายิงพลาด ให้รีโหลดข้อมูลใหม่
      const { data } = await supabase.from('cart_items').select('*, products!inner(*, collection_groups!inner(*), stock(*))').eq('id', item.id).single();
      if (data) {
        setCartItems(prev => prev.map(cartItem => cartItem.id === item.id ? data as any : cartItem));
      }
    }
    
    setUpdatingId(null);
  };

  const handleRemoveItem = async (cartId: string) => {
    setUpdatingId(cartId);
    
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('id', cartId);

    if (!error) {
      setCartItems(prev => prev.filter(item => item.id !== cartId));
    } else {
      console.error("Error removing item:", error);
    }
    
    setUpdatingId(null);
  };

  const subtotal = cartItems.reduce((acc, item) => {
    return acc + (item.products.price * item.quantity);
  }, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#EAE7E0] flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-2 border-[#3A3835]/10 border-t-[#84492C] rounded-full animate-spin mb-4"></div>
        <p className="text-[#8C8A86] text-[10px] uppercase tracking-[0.2em] animate-pulse">Loading Cart...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#EAE7E0] text-[#3A3835] font-sans flex flex-col selection:bg-[#C8A97E]/20 pb-12 pt-24 md:pt-32">
      <div className="max-w-6xl w-full mx-auto px-6">
        
        <button 
          onClick={() => router.back()} 
          className="mb-8 text-[10px] sm:text-[11px] font-bold tracking-[0.2em] uppercase text-[#8C8A86] hover:text-[#84492C] flex items-center gap-2 transition-colors group cursor-pointer w-fit"
        >
          <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" /> 
          <span>CONTINUE SHOPPING</span>
        </button>

        <div className="mb-10 border-b border-[#3A3835]/10 pb-6 flex items-end justify-between">
          <div>
            <h1 className="font-serif text-3xl uppercase tracking-widest text-[#3A3835]">
              YOUR CART
            </h1>
            <p className="text-[11px] uppercase tracking-[0.15em] text-[#8C8A86] mt-2">
              {cartItems.length} {cartItems.length === 1 ? 'Item' : 'Items'} in your bag
            </p>
          </div>
        </div>

        {cartItems.length === 0 ? (
          <div className="bg-white p-16 shadow-[0_10px_40px_rgba(0,0,0,0.03)] rounded-[2px] flex flex-col items-center justify-center text-center border border-[#3A3835]/5 h-[40vh]">
            <div className="w-20 h-20 bg-[#F9F8F6] rounded-full flex items-center justify-center mb-6">
              <ShoppingBag className="w-8 h-8 text-[#8C8A86]" />
            </div>
            <h2 className="font-serif text-xl uppercase tracking-wider text-[#3A3835] mb-3">Your cart is empty</h2>
            <p className="text-[12px] text-[#8C8A86] mb-8">Looks like you haven't added anything to your cart yet.</p>
            <Link 
              href="/prop" 
              title="Browse our props collections"
              className="bg-[#3A3835] text-white px-10 py-4 text-[10px] uppercase font-bold tracking-[0.2em] hover:bg-[#84492C] transition-colors shadow-sm rounded-[2px]"
            >
              DISCOVER COLLECTIONS
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            
            <div className="lg:col-span-8 flex flex-col gap-4">
              {cartItems.map((item) => {
                // คำนวณสต็อกเพื่อเช็คขีดจำกัด
                const totalStock = getTotalStock(item);
                const isMaxStockReached = item.quantity >= totalStock;
                const outOfStock = totalStock <= 0;

                return (
                  <div key={item.id} className={`bg-white p-4 sm:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)] rounded-[2px] border border-[#3A3835]/5 flex flex-col sm:flex-row gap-6 transition-opacity ${updatingId === item.id ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                    
                    <Link 
                      href={`/prop/${item.products.collection_group_id}/${item.products.sku}`}
                      title={`View details of ${item.products.name}`}
                      className="w-full sm:w-[120px] aspect-square bg-[#F4F1EB] rounded-[2px] overflow-hidden flex-shrink-0 group relative"
                    >
                      {item.products.image_url ? (
                        <img 
                          src={item.products.image_url} 
                          alt={item.products.name} 
                          title={item.products.name} 
                          className="w-full h-full object-contain p-2 mix-blend-multiply group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[8px] text-[#8C8A86] uppercase tracking-widest">No Image</div>
                      )}
                      
                      {/* ป้ายเตือนถ้าของหมด */}
                      {outOfStock && (
                        <div className="absolute inset-0 bg-white/60 flex items-center justify-center backdrop-blur-[1px]">
                          <span className="bg-[#3A3835] text-white text-[8px] uppercase tracking-widest px-2 py-1 font-bold rounded-sm">Out of Stock</span>
                        </div>
                      )}
                    </Link>

                    <div className="flex-1 flex flex-col justify-between py-1">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          {/* ⚡ แสดงชื่อ Collection System (Wood / Decor) */}
                          <p className="text-[8px] uppercase tracking-[0.2em] text-[#84492C] font-bold mb-1.5">
                            {item.products.collection_groups?.product_sup || 'COLLECTION'}
                          </p>
                          <Link 
                            href={`/prop/${item.products.collection_group_id}/${item.products.sku}`}
                            title={`View details of ${item.products.name}`}
                            className="font-serif text-lg uppercase tracking-wider text-[#3A3835] hover:text-[#84492C] transition-colors line-clamp-2"
                          >
                            {item.products.name}
                          </Link>
                          <p className="text-[10px] text-[#8C8A86] uppercase tracking-[0.1em] mt-1.5">
                            SKU: {item.products.sku}
                          </p>
                        </div>
                        
                        <button 
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-[#8C8A86] hover:text-red-500 transition-colors p-1"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-6 border-t border-[#3A3835]/5 pt-4 gap-4">
                        
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center border border-[#3A3835]/15 rounded-[2px] bg-[#F9F8F6] w-fit">
                            <button 
                              onClick={() => handleUpdateQuantity(item, -1)}
                              disabled={item.quantity <= 1 || outOfStock}
                              className="p-2 text-[#8C8A86] hover:text-[#3A3835] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-8 text-center text-[11px] font-bold text-[#3A3835]">
                              {item.quantity}
                            </span>
                            <button 
                              onClick={() => handleUpdateQuantity(item, 1)}
                              disabled={isMaxStockReached || outOfStock}
                              className={`p-2 transition-colors ${isMaxStockReached ? 'text-[#8C8A86]/30 cursor-not-allowed' : 'text-[#8C8A86] hover:text-[#3A3835]'}`}
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          
                          {/* ⚡ แสดงสถานะ Stock */}
                          <div className="flex items-center gap-1.5">
                            {outOfStock ? (
                              <span className="text-[9px] uppercase tracking-wider text-red-500 font-bold flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" /> OUT OF STOCK
                              </span>
                            ) : (
                              <span className={`text-[9px] uppercase tracking-wider font-bold ${isMaxStockReached ? 'text-[#84492C]' : 'text-[#8C8A86]'}`}>
                                {totalStock} IN STOCK
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-left sm:text-right">
                          <p className="text-[12px] font-bold text-[#3A3835] tracking-wide">
                            THB {(item.products.price * item.quantity).toLocaleString()}
                          </p>
                          {item.quantity > 1 && (
                            <p className="text-[9px] text-[#8C8A86] tracking-wider mt-0.5">
                              THB {item.products.price.toLocaleString()} each
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>

            <div className="lg:col-span-4 sticky top-32">
              <div className="bg-white p-8 shadow-[0_10px_40px_rgba(0,0,0,0.03)] rounded-[2px] border border-[#3A3835]/5">
                <h2 className="font-serif text-lg uppercase tracking-widest text-[#3A3835] mb-6 border-b border-[#3A3835]/10 pb-4">
                  ORDER SUMMARY
                </h2>

                <div className="space-y-4 text-[12px] tracking-wide mb-6">
                  <div className="flex justify-between text-[#8C8A86]">
                    <span>Subtotal</span>
                    <span>THB {subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-[#8C8A86]">
                    <span>Shipping</span>
                    <span>Calculated at checkout</span>
                  </div>
                </div>

                <div className="flex justify-between items-end border-t border-[#3A3835]/10 pt-6 mb-8">
                  <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#3A3835]">TOTAL</span>
                  <span className="text-xl font-bold text-[#84492C]">THB {subtotal.toLocaleString()}</span>
                </div>

                <button 
                  disabled={cartItems.some(item => getTotalStock(item) <= 0)}
                  className="w-full bg-[#3A3835] text-white py-4 text-[10px] uppercase font-bold tracking-[0.2em] hover:bg-[#84492C] transition-colors shadow-sm rounded-[2px] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  CONTACT TO PURCHASE
                </button>
                
                <p className="text-[9px] text-[#8C8A86] text-center mt-4 tracking-wider leading-relaxed">
                  Taxes and shipping calculated during purchase process.
                </p>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}