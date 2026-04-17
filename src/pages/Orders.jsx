import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOrders } from '../context/OrderContext';
import { useAuth } from '../context/AuthContext';
import {
  Plus, Search, ShoppingCart, CheckCircle2, MessageSquare, Printer, X, Package, Trash2, Send, Truck, Image, Clock, Loader2
} from 'lucide-react';

const fileToBase64 = (file) => new Promise((resolve) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.readAsDataURL(file);
});

const Orders = () => {
  const { orders, inventory, wholesalers, createOrder, updateOrderStatus, addResponse, markShipped, nextOrderNumber } = useOrders();
  const { currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [chatMessage, setChatMessage] = useState('');
  const [chatImage, setChatImage] = useState(null);
  const [chatImagePreview, setChatImagePreview] = useState(null);
  const chatFileRef = useRef(null);
  const orderPhotoRef = useRef(null);

  const isSuperAdmin = currentUser?.role === 'superadmin';
  const isAssembler = currentUser?.role === 'assembler';
  const isAdmin = currentUser?.role === 'admin' || isSuperAdmin;

  const visibleOrders = isSuperAdmin ? orders : orders.filter(o => o.adminId === currentUser?.id || isAssembler);
  const filteredOrders = visibleOrders.filter(o =>
    o.code.toString().includes(searchTerm) ||
    o.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.wholesaler?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Keep selectedOrder in sync
  const activeSelected = selectedOrder ? orders.find(o => o.id === selectedOrder.id) : null;

  const [newOrder, setNewOrder] = useState({
    client: { name: '', phone: '' }, items: [], wholesalerId: '', note: '', isUrgent: false, photos: []
  });

  const handleCreateOrder = (e) => {
    e.preventDefault();
    const total = newOrder.items.reduce((acc, item) => acc + (item.price * item.qty), 0);
    const wholesaler = wholesalers.find(w => w.id === newOrder.wholesalerId);
    createOrder({ ...newOrder, wholesaler, total, status: newOrder.isUrgent ? '🚨 Срочное' : '💭 В процессе' });
    setIsAddModalOpen(false);
    setNewOrder({ client: { name: '', phone: '' }, items: [], wholesalerId: '', note: '', isUrgent: false, photos: [] });
  };

  const addItemToOrder = (productId) => {
    const product = inventory.find(p => p.id === productId);
    if (!product) return;
    setNewOrder(prev => {
      const existing = prev.items.find(i => i.id === productId);
      if (existing) return { ...prev, items: prev.items.map(i => i.id === productId ? { ...i, qty: i.qty + 1 } : i) };
      return { ...prev, items: [...prev.items, { ...product, qty: 1 }] };
    });
  };

  const handleOrderPhoto = async (e) => {
    const files = Array.from(e.target.files);
    for (const file of files) {
      const base64 = await fileToBase64(file);
      setNewOrder(prev => ({ ...prev, photos: [...prev.photos, base64] }));
    }
  };

  const handleChatImageSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const base64 = await fileToBase64(file);
    setChatImage(base64);
    setChatImagePreview(base64);
  };

  const handleSendChat = () => {
    if (!activeSelected) return;
    if (!chatMessage.trim() && !chatImage) return;
    const extra = {};
    if (chatImage) {
      extra.image = chatImage;
      extra.type = chatMessage.trim() ? 'message' : 'photo';
    }
    addResponse(activeSelected.id, chatMessage.trim() || '📷 Фото', currentUser.id, currentUser.name, extra);
    setChatMessage('');
    setChatImage(null);
    setChatImagePreview(null);
  };

  const handleReaction = (reactionType) => {
    if (!activeSelected) return;
    const label = reactionType === 'progress' ? '💭 В процессе' : '✅ Готово';
    addResponse(activeSelected.id, label, currentUser.id, currentUser.name, { type: 'reaction' });
  };

  const [viewImage, setViewImage] = useState(null);

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Заказы</h1>
          <p className="text-gray-500 text-sm mt-1">Управление торговыми данными</p>
        </div>
        {isAdmin && (
          <button onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 bg-[#e8de8c] hover:bg-[#d4cb7a] text-black font-semibold rounded-xl transition-colors flex items-center gap-2 text-sm">
            <Plus size={16} /> Создать заказ
          </button>
        )}
      </div>

      {/* Search */}
      <div className="bg-[#111114] border border-white/[0.06] rounded-2xl p-3 flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
          <input type="text" placeholder="Поиск по коду, клиенту или оптовику..." value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl py-2.5 pl-9 pr-4 focus:outline-none focus:border-[#e8de8c]/30 transition-colors text-sm" />
        </div>
      </div>

      {/* Orders grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <AnimatePresence mode="popLayout">
          {filteredOrders.map((order, idx) => (
            <motion.div layout key={order.id}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: idx * 0.03 }}
              onClick={() => setSelectedOrder(order)}
              className="bg-[#111114] border border-white/[0.06] rounded-2xl p-5 hover:border-[#e8de8c]/20 transition-all cursor-pointer group">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold ${
                    order.status?.includes('✅') ? 'bg-emerald-500/10 text-emerald-400' :
                    order.status?.includes('🚨') ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'
                  }`}>#{order.code}</div>
                  <div>
                    <h3 className="font-semibold group-hover:text-[#e8de8c] transition-colors">{order.client?.name || 'Безымянный'}</h3>
                    <span className={`text-xs font-medium ${order.wholesaler ? 'text-purple-400' : 'text-gray-500'}`}>
                      {order.wholesaler ? `Оптовик: ${order.wholesaler.name}` : 'Розница'}
                    </span>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                  order.status?.includes('✅') ? 'bg-emerald-500/10 text-emerald-400' :
                  order.status?.includes('🚨') ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'
                }`}>{order.status}</span>
              </div>

              {/* Photos preview */}
              {order.photos?.length > 0 && (
                <div className="mt-3 flex gap-2">
                  {order.photos.slice(0, 3).map((p, i) => (
                    <img key={i} src={p} className="w-12 h-12 rounded-lg object-cover border border-white/10" alt="" />
                  ))}
                  {order.photos.length > 3 && <span className="text-xs text-gray-500 self-center">+{order.photos.length - 3}</span>}
                </div>
              )}

              <div className="mt-4 flex items-center justify-between pt-4 border-t border-white/[0.04]">
                <div className="flex -space-x-2">
                  {order.items.slice(0, 3).map((item, i) => (
                    <div key={i} className="w-8 h-8 bg-[#1a1a1f] border-2 border-[#111114] rounded-full flex items-center justify-center">
                      <Package size={12} className="text-gray-500" />
                    </div>
                  ))}
                  {order.items.length > 3 && (
                    <div className="w-8 h-8 bg-white/[0.04] border-2 border-[#111114] rounded-full flex items-center justify-center text-[10px] font-medium text-gray-400">
                      +{order.items.length - 3}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Итого</p>
                  <p className="text-lg font-bold">{order.total?.toLocaleString()} ₽</p>
                </div>
              </div>

              {order.responseRoom.length > 0 && (
                <div className="mt-3 px-3 py-2 bg-blue-500/5 rounded-lg flex items-center gap-2">
                  <MessageSquare size={12} className="text-blue-400 shrink-0" />
                  <p className="text-xs text-blue-400 truncate">{order.responseRoom[order.responseRoom.length - 1].userName}: {order.responseRoom[order.responseRoom.length - 1].message}</p>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Image viewer */}
      <AnimatePresence>
        {viewImage && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6" onClick={() => setViewImage(null)}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/90" />
            <motion.img initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}
              src={viewImage} className="max-w-full max-h-[85vh] rounded-2xl relative z-10 object-contain" />
          </div>
        )}
      </AnimatePresence>

      {/* Order details modal */}
      <AnimatePresence>
        {activeSelected && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedOrder(null)} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-4xl bg-[#111114] border border-white/10 rounded-2xl shadow-2xl relative z-10 flex flex-col max-h-[90vh]">
              <div className="p-5 border-b border-white/[0.06] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#e8de8c]/10 rounded-xl flex items-center justify-center text-[#e8de8c] font-bold text-lg">#{activeSelected.code}</div>
                  <div>
                    <h2 className="text-lg font-bold">{activeSelected.client?.name}</h2>
                    <p className="text-xs text-gray-500">Создано: {activeSelected.adminName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 hover:bg-white/5 rounded-lg text-gray-500"><Printer size={18} /></button>
                  <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-white/5 rounded-lg text-gray-500"><X size={18} /></button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-5">
                  <section>
                    <h4 className="text-xs text-gray-500 font-medium mb-3">Статус</h4>
                    <div className="flex gap-2">
                      {['🚨 Срочное', '💭 В процессе', '✅ Сделано'].map(s => (
                        <button key={s} onClick={() => updateOrderStatus(activeSelected.id, s, currentUser.id, currentUser.name)}
                          className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                            activeSelected.status === s ? 'bg-[#e8de8c] text-black' : 'bg-white/[0.04] text-gray-400 hover:bg-white/[0.08]'
                          }`}>{s.split(' ')[1]}</button>
                      ))}
                    </div>
                  </section>

                  <section>
                    <h4 className="text-xs text-gray-500 font-medium mb-3">Товары ({activeSelected.items.length})</h4>
                    <div className="space-y-2">
                      {activeSelected.items.map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-white/[0.03] rounded-xl">
                          <div className="flex items-center gap-3">
                            <Package size={16} className="text-gray-500" />
                            <div>
                              <p className="text-sm font-medium">{item.name}</p>
                              <p className="text-xs text-gray-500">{item.price.toLocaleString()} ₽/ед.</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-sm">x{item.qty}</p>
                            <p className="text-xs text-[#e8de8c]">{(item.price * item.qty).toLocaleString()} ₽</p>
                          </div>
                        </div>
                      ))}
                      <div className="flex items-center justify-between p-4 bg-[#e8de8c]/5 border border-[#e8de8c]/10 rounded-xl mt-3">
                        <span className="font-semibold">Итого</span>
                        <span className="text-xl font-bold">{activeSelected.total?.toLocaleString()} ₽</span>
                      </div>
                    </div>
                  </section>

                  {/* Order photos */}
                  {activeSelected.photos?.length > 0 && (
                    <section>
                      <h4 className="text-xs text-gray-500 font-medium mb-3">Фото заказа</h4>
                      <div className="flex flex-wrap gap-2">
                        {activeSelected.photos.map((p, i) => (
                          <img key={i} src={p} onClick={() => setViewImage(p)}
                            className="w-20 h-20 rounded-xl object-cover border border-white/10 cursor-pointer hover:border-[#e8de8c]/40 transition-colors" alt="" />
                        ))}
                      </div>
                    </section>
                  )}

                  {activeSelected.note && (
                    <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl">
                      <p className="text-xs text-amber-400 font-medium mb-1">Примечание</p>
                      <p className="text-sm">{activeSelected.note}</p>
                    </div>
                  )}
                </div>

                {/* Chat / Response room */}
                <div className="flex flex-col">
                  <h4 className="text-xs text-gray-500 font-medium mb-3 flex items-center gap-1.5">
                    <MessageSquare size={12} /> Комната ответа
                  </h4>

                  {/* Reaction buttons */}
                  <div className="flex gap-2 mb-3">
                    <button onClick={() => handleReaction('progress')}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-xl text-xs font-semibold text-blue-400 transition-colors">
                      <Clock size={14} /> В процессе
                    </button>
                    <button onClick={() => handleReaction('done')}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl text-xs font-semibold text-emerald-400 transition-colors">
                      <CheckCircle2 size={14} /> Готово
                    </button>
                  </div>

                  <div className="flex-1 bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 flex flex-col gap-3 min-h-[300px]">
                    <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                      {activeSelected.responseRoom.map((resp, i) => (
                        <div key={i} className={`flex flex-col ${resp.userId === currentUser.id ? 'items-end' : 'items-start'}`}>
                          {/* Reaction bubble */}
                          {resp.type === 'reaction' ? (
                            <div className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                              resp.message.includes('✅') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15' : 'bg-blue-500/10 text-blue-400 border border-blue-500/15'
                            }`}>
                              {resp.message.includes('✅') ? <CheckCircle2 size={13} /> : <Clock size={13} />}
                              <span>{resp.userName}</span> — {resp.message}
                            </div>
                          ) : (
                            <div className={`max-w-[85%] p-3 rounded-xl ${
                              resp.userId === currentUser.id ? 'bg-[#e8de8c]/10 rounded-tr-none' : 'bg-white/[0.04] rounded-tl-none'
                            }`}>
                              <p className="text-[10px] font-semibold text-[#e8de8c] mb-1">{resp.userName}</p>
                              {resp.image && (
                                <img src={resp.image} onClick={() => setViewImage(resp.image)}
                                  className="max-w-full max-h-48 rounded-lg mb-2 cursor-pointer hover:opacity-80 transition-opacity" alt="" />
                              )}
                              {resp.message && resp.message !== '📷 Фото' && (
                                <p className="text-sm">{resp.message}</p>
                              )}
                            </div>
                          )}
                          <span className="text-[10px] text-gray-600 mt-0.5 px-1">{new Date(resp.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      ))}
                      {activeSelected.responseRoom.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-gray-700">
                          <MessageSquare size={28} className="mb-1" />
                          <p className="text-xs">Нет сообщений</p>
                        </div>
                      )}
                    </div>

                    {/* Image preview */}
                    {chatImagePreview && (
                      <div className="relative inline-block">
                        <img src={chatImagePreview} className="h-16 rounded-lg border border-white/10" alt="" />
                        <button onClick={() => { setChatImage(null); setChatImagePreview(null); }}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white">
                          <X size={10} />
                        </button>
                      </div>
                    )}

                    {/* Input */}
                    <div className="flex items-center gap-2">
                      <input type="file" ref={chatFileRef} accept="image/*" className="hidden" onChange={handleChatImageSelect} />
                      <button onClick={() => chatFileRef.current?.click()}
                        className="p-2.5 bg-white/[0.04] hover:bg-white/[0.08] rounded-xl text-gray-500 hover:text-[#e8de8c] transition-colors shrink-0">
                        <Image size={16} />
                      </button>
                      <input type="text" placeholder="Сообщение..." value={chatMessage}
                        onChange={(e) => setChatMessage(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSendChat(); }}
                        className="flex-1 bg-white/[0.04] border border-white/[0.06] rounded-xl py-2.5 px-3 focus:outline-none focus:border-[#e8de8c]/30 text-sm" />
                      <button onClick={handleSendChat}
                        className="p-2.5 bg-[#e8de8c] rounded-xl flex items-center justify-center text-black hover:bg-[#d4cb7a] transition-colors shrink-0">
                        <Send size={14} />
                      </button>
                    </div>
                  </div>

                  {isAssembler && !activeSelected.status?.includes('✅') && (
                    <button onClick={() => updateOrderStatus(activeSelected.id, '✅ Сделано', currentUser.id, currentUser.name)}
                      className="mt-3 w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors">
                      <CheckCircle2 size={18} /> Отметить готовым
                    </button>
                  )}
                  {isAdmin && activeSelected.status?.includes('✅') && (
                    <button onClick={() => { markShipped(activeSelected.id); setSelectedOrder(null); }}
                      className="mt-3 w-full bg-[#e8de8c] hover:bg-[#d4cb7a] text-black font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors">
                      <Truck size={18} /> Отгрузить
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add order modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xl bg-[#111114] border border-white/10 rounded-2xl shadow-2xl relative z-10">
              <form onSubmit={handleCreateOrder} className="flex flex-col max-h-[90vh]">
                <div className="p-5 border-b border-white/[0.06] flex items-center justify-between shrink-0">
                  <div>
                    <h2 className="text-lg font-bold">Новый заказ</h2>
                    <p className="text-xs text-[#e8de8c]">Код: #{nextOrderNumber}</p>
                  </div>
                  <button type="button" onClick={() => setIsAddModalOpen(false)} className="p-1.5 hover:bg-white/5 rounded-lg"><X size={20} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 font-medium mb-1 block">Клиент</label>
                      <input required type="text" value={newOrder.client.name}
                        onChange={(e) => setNewOrder({...newOrder, client: {...newOrder.client, name: e.target.value}})}
                        className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl p-3 focus:outline-none focus:border-[#e8de8c]/30 text-sm" placeholder="ФИО" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 font-medium mb-1 block">Телефон</label>
                      <input type="text" value={newOrder.client.phone}
                        onChange={(e) => setNewOrder({...newOrder, client: {...newOrder.client, phone: e.target.value}})}
                        className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl p-3 focus:outline-none focus:border-[#e8de8c]/30 text-sm" placeholder="+7..." />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-medium mb-1 block">Оптовик</label>
                    <select value={newOrder.wholesalerId} onChange={(e) => setNewOrder({...newOrder, wholesalerId: e.target.value})}
                      className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl p-3 focus:outline-none focus:border-[#e8de8c]/30 text-sm text-gray-300 appearance-none">
                      <option value="">Розничный</option>
                      {wholesalers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-medium mb-1 block">Товары</label>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {inventory.map(item => (
                        <button key={item.id} type="button" onClick={() => addItemToOrder(item.id)}
                          className="px-3 py-2 bg-white/[0.04] hover:bg-[#e8de8c]/10 border border-white/[0.06] hover:border-[#e8de8c]/20 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors">
                          <Plus size={12} /> {item.name}
                        </button>
                      ))}
                    </div>
                    {newOrder.items.map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-[#e8de8c]/5 rounded-xl border border-[#e8de8c]/10 mb-2">
                        <span className="text-sm font-medium">{item.name}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-400">{item.price.toLocaleString()} ₽</span>
                          <div className="flex items-center bg-black/20 rounded-lg">
                            <button type="button" onClick={() => setNewOrder(prev => ({...prev, items: prev.items.map(it => it.id === item.id ? {...it, qty: Math.max(1, it.qty - 1)} : it)}))}
                              className="w-7 h-7 flex items-center justify-center hover:bg-white/10 rounded-l-lg text-sm">-</button>
                            <span className="w-8 text-center text-sm font-semibold">{item.qty}</span>
                            <button type="button" onClick={() => setNewOrder(prev => ({...prev, items: prev.items.map(it => it.id === item.id ? {...it, qty: it.qty + 1} : it)}))}
                              className="w-7 h-7 flex items-center justify-center hover:bg-white/10 rounded-r-lg text-sm">+</button>
                          </div>
                          <button type="button" onClick={() => setNewOrder(prev => ({...prev, items: prev.items.filter(it => it.id !== item.id)}))}
                            className="text-red-400 p-1 hover:bg-red-400/10 rounded-lg"><Trash2 size={14} /></button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Photo upload */}
                  <div>
                    <label className="text-xs text-gray-500 font-medium mb-1 block">Фото заказа</label>
                    <input type="file" ref={orderPhotoRef} accept="image/*" multiple className="hidden" onChange={handleOrderPhoto} />
                    <div className="flex items-center gap-2 flex-wrap">
                      {newOrder.photos.map((p, i) => (
                        <div key={i} className="relative">
                          <img src={p} className="w-16 h-16 rounded-lg object-cover border border-white/10" alt="" />
                          <button type="button" onClick={() => setNewOrder(prev => ({...prev, photos: prev.photos.filter((_, j) => j !== i)}))}
                            className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white"><X size={8} /></button>
                        </div>
                      ))}
                      <button type="button" onClick={() => orderPhotoRef.current?.click()}
                        className="w-16 h-16 bg-white/[0.04] hover:bg-white/[0.08] border border-dashed border-white/10 rounded-lg flex flex-col items-center justify-center text-gray-500 hover:text-[#e8de8c] transition-colors">
                        <Image size={18} />
                        <span className="text-[8px] mt-0.5">Добавить</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-gray-500 font-medium mb-1 block">Примечание</label>
                    <textarea value={newOrder.note} onChange={(e) => setNewOrder({...newOrder, note: e.target.value})}
                      className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl p-3 focus:outline-none focus:border-[#e8de8c]/30 text-sm h-20 resize-none" placeholder="Детали..." />
                  </div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div className="relative">
                      <input type="checkbox" checked={newOrder.isUrgent} onChange={(e) => setNewOrder({...newOrder, isUrgent: e.target.checked})} className="sr-only" />
                      <div className={`w-10 h-5 rounded-full transition-colors ${newOrder.isUrgent ? 'bg-red-500' : 'bg-white/10'}`} />
                      <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${newOrder.isUrgent ? 'translate-x-5' : ''}`} />
                    </div>
                    <span className={`text-sm font-medium ${newOrder.isUrgent ? 'text-red-400' : 'text-gray-500'}`}>
                      {newOrder.isUrgent ? 'Срочный' : 'Обычный'}
                    </span>
                  </label>
                </div>
                <div className="p-5 border-t border-white/[0.06] flex items-center justify-between shrink-0">
                  <div>
                    <p className="text-xs text-gray-500">Итого</p>
                    <p className="text-lg font-bold">{newOrder.items.reduce((acc, item) => acc + (item.price * item.qty), 0).toLocaleString()} ₽</p>
                  </div>
                  <button type="submit" className="px-8 py-3 bg-[#e8de8c] hover:bg-[#d4cb7a] text-black font-semibold rounded-xl transition-colors text-sm">Создать</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Orders;
