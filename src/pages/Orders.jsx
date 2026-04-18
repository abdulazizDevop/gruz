import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOrders } from '../context/OrderContext';
import { useAuth } from '../context/AuthContext';
import {
  Plus, Search, CheckCircle2, MessageSquare, Printer, X, Trash2, Send, Truck, Image as ImageIcon, Clock, DoorOpen, User, Phone, MapPin, Calendar, AlertCircle
} from 'lucide-react';
import { formatPhone, isValidPhone, formatMoneyInput, parseMoneyInput, required } from '../lib/validation';

const fileToBase64 = (file) => new Promise((resolve) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.readAsDataURL(file);
});

const formatMoney = (v) => {
  const n = Number(v || 0);
  return n.toLocaleString('ru-RU');
};

const EMPTY_ORDER = {
  model: '',
  size: '',
  canvas: '',
  color: '',
  casing: '',
  glass: '',
  grille: '',
  hardware: '',
  threshold: '',
  crown: '',
  panelOuter: '',
  panelInner: '',
  transom: '',
  note: '',
  client: { name: '', phone: '', address: '' },
  price: '',
  advance: '',
  wholesalerId: '',
  isUrgent: false,
  photos: [],
};

const CANVAS_OPTIONS = [
  { value: 'Одностворчатый', label: 'Одностворчатый' },
  { value: 'Двустворчатый', label: 'Двустворчатый' },
];

const DOOR_FIELDS = [
  { key: 'model', label: 'Модель' },
  { key: 'size', label: 'Размер' },
  { key: 'canvas', label: 'Полотно' },
  { key: 'color', label: 'Цвет' },
  { key: 'casing', label: 'Наличник' },
  { key: 'glass', label: 'Стекло' },
  { key: 'grille', label: 'Решетка' },
  { key: 'hardware', label: 'Фурнитура' },
  { key: 'threshold', label: 'Порог нержавейка' },
  { key: 'crown', label: 'Корона' },
  { key: 'panelOuter', label: 'Панель наружная' },
  { key: 'panelInner', label: 'Панель внутренняя' },
  { key: 'transom', label: 'Фрамуга' },
];

const Orders = () => {
  const { orders, wholesalers, createOrder, updateOrderStatus, addResponse, markShipped, nextOrderNumber } = useOrders();
  const { currentUser } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [chatMessage, setChatMessage] = useState('');
  const [chatImage, setChatImage] = useState(null);
  const [chatImagePreview, setChatImagePreview] = useState(null);
  const [viewImage, setViewImage] = useState(null);
  const chatFileRef = useRef(null);
  const orderPhotoRef = useRef(null);

  const isSuperAdmin = currentUser?.role === 'superadmin';
  const isAssembler = currentUser?.role === 'assembler';
  const isAdmin = currentUser?.role === 'admin' || isSuperAdmin;

  const visibleOrders = isSuperAdmin
    ? orders
    : orders.filter(o => o.adminId === currentUser?.id || isAssembler);

  const filteredOrders = visibleOrders.filter(o => {
    const q = searchTerm.toLowerCase();
    return (
      String(o.code || '').includes(searchTerm) ||
      (o.client?.name || '').toLowerCase().includes(q) ||
      (o.model || '').toLowerCase().includes(q) ||
      (o.client?.phone || '').toLowerCase().includes(q)
    );
  });

  const activeSelected = selectedOrder ? orders.find(o => o.id === selectedOrder.id) : null;

  const [newOrder, setNewOrder] = useState(EMPTY_ORDER);
  const [errors, setErrors] = useState({});

  const validateOrder = (o) => {
    const err = {};
    const modelErr = required(o.model, 'Модель');
    if (modelErr) err.model = modelErr;
    const sizeErr = required(o.size, 'Размер');
    if (sizeErr) err.size = sizeErr;
    const nameErr = required(o.client?.name, 'Имя клиента');
    if (nameErr) err.clientName = nameErr;

    if (o.client?.phone && !isValidPhone(o.client.phone)) {
      err.clientPhone = 'Неверный формат телефона';
    }
    const priceNum = parseMoneyInput(o.price);
    const advanceNum = parseMoneyInput(o.advance);
    if (!priceNum || priceNum <= 0) err.price = 'Укажите цену > 0';
    if (advanceNum > priceNum) err.advance = 'Аванс не может быть больше цены';
    return err;
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    const err = validateOrder(newOrder);
    setErrors(err);
    if (Object.keys(err).length > 0) return;

    const wholesaler = newOrder.wholesalerId
      ? wholesalers.find(w => w.id === newOrder.wholesalerId) || null
      : null;
    const priceNum = parseMoneyInput(newOrder.price);
    const advanceNum = parseMoneyInput(newOrder.advance);

    await createOrder({
      ...newOrder,
      price: priceNum,
      advance: advanceNum,
      total: priceNum,
      wholesaler,
      items: [],
    });
    setIsAddModalOpen(false);
    setNewOrder(EMPTY_ORDER);
    setErrors({});
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

  const updateField = (key, value) => {
    setNewOrder(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: null }));
  };
  const updateClient = (key, value) => {
    const v = key === 'phone' ? formatPhone(value) : value;
    setNewOrder(prev => ({ ...prev, client: { ...prev.client, [key]: v } }));
    const errKey = 'client' + key.charAt(0).toUpperCase() + key.slice(1);
    if (errors[errKey]) setErrors(prev => ({ ...prev, [errKey]: null }));
  };
  const updatePrice = (key, value) => {
    const formatted = formatMoneyInput(value);
    setNewOrder(prev => ({ ...prev, [key]: formatted }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: null }));
  };

  const FieldError = ({ msg }) =>
    msg ? (
      <p className="text-[11px] text-red-400 mt-1 flex items-center gap-1">
        <AlertCircle size={11} /> {msg}
      </p>
    ) : null;

  const remaining = (order) => Math.max(0, (order.price || 0) - (order.advance || 0));

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Заказы</h1>
          <p className="text-gray-500 text-sm mt-1">Управление заказами дверей</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 bg-[#e8de8c] hover:bg-[#d4cb7a] text-black font-semibold rounded-xl transition-colors flex items-center gap-2 text-sm"
          >
            <Plus size={16} /> Создать заказ
          </button>
        )}
      </div>

      {/* Search */}
      <div className="bg-[#111114] border border-white/[0.06] rounded-2xl p-3 flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
          <input
            type="text"
            placeholder="Поиск по коду, клиенту, модели, телефону..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl py-2.5 pl-9 pr-4 focus:outline-none focus:border-[#e8de8c]/30 transition-colors text-sm"
          />
        </div>
      </div>

      {/* Orders grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <AnimatePresence mode="popLayout">
          {filteredOrders.map((order, idx) => (
            <motion.div
              layout
              key={order.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: idx * 0.03 }}
              onClick={() => setSelectedOrder(order)}
              className="bg-[#111114] border border-white/[0.06] rounded-2xl p-5 hover:border-[#e8de8c]/20 transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold ${
                    order.status?.includes('✅') ? 'bg-emerald-500/10 text-emerald-400' :
                    order.status?.includes('🚨') ? 'bg-red-500/10 text-red-400' :
                    'bg-blue-500/10 text-blue-400'
                  }`}>#{order.code}</div>
                  <div>
                    <h3 className="font-semibold group-hover:text-[#e8de8c] transition-colors">
                      {order.client?.name || 'Без имени'}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                      <Calendar size={10} />
                      {new Date(order.createdAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                  order.status?.includes('✅') ? 'bg-emerald-500/10 text-emerald-400' :
                  order.status?.includes('🚨') ? 'bg-red-500/10 text-red-400' :
                  'bg-blue-500/10 text-blue-400'
                }`}>{order.status}</span>
              </div>

              {/* Door quick specs */}
              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="bg-white/[0.03] rounded-lg px-3 py-2">
                  <p className="text-[10px] text-gray-500">Модель</p>
                  <p className="text-sm font-medium truncate">{order.model || '—'}</p>
                </div>
                <div className="bg-white/[0.03] rounded-lg px-3 py-2">
                  <p className="text-[10px] text-gray-500">Размер</p>
                  <p className="text-sm font-medium truncate">{order.size || '—'}</p>
                </div>
                <div className="bg-white/[0.03] rounded-lg px-3 py-2">
                  <p className="text-[10px] text-gray-500">Цвет</p>
                  <p className="text-sm font-medium truncate">{order.color || '—'}</p>
                </div>
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

              {/* Price footer */}
              <div className="mt-4 flex items-center justify-between pt-4 border-t border-white/[0.04]">
                <div>
                  <p className="text-xs text-gray-500">Телефон</p>
                  <p className="text-sm font-medium">{order.client?.phone || '—'}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Цена</p>
                  <p className="text-lg font-bold">{formatMoney(order.price)} ₽</p>
                </div>
              </div>

              {order.responseRoom?.length > 0 && (
                <div className="mt-3 px-3 py-2 bg-blue-500/5 rounded-lg flex items-center gap-2">
                  <MessageSquare size={12} className="text-blue-400 shrink-0" />
                  <p className="text-xs text-blue-400 truncate">
                    {order.responseRoom[order.responseRoom.length - 1].userName}: {order.responseRoom[order.responseRoom.length - 1].message}
                  </p>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredOrders.length === 0 && (
          <div className="col-span-full py-16 flex flex-col items-center text-center text-gray-600">
            <DoorOpen size={36} className="mb-2" />
            <p className="text-sm">Заказов пока нет</p>
          </div>
        )}
      </div>

      {/* Image viewer */}
      <AnimatePresence>
        {viewImage && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6" onClick={() => setViewImage(null)}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/90" />
            <motion.img
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              src={viewImage}
              className="max-w-full max-h-[85vh] rounded-2xl relative z-10 object-contain"
            />
          </div>
        )}
      </AnimatePresence>

      {/* Order details modal */}
      <AnimatePresence>
        {activeSelected && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedOrder(null)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-5xl bg-[#111114] border border-white/10 rounded-2xl shadow-2xl relative z-10 flex flex-col max-h-[92vh]"
            >
              <div className="p-5 border-b border-white/[0.06] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#e8de8c]/10 rounded-xl flex items-center justify-center text-[#e8de8c] font-bold text-lg">
                    #{activeSelected.code}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">{activeSelected.client?.name || 'Без имени'}</h2>
                    <p className="text-xs text-gray-500">
                      Создал: {activeSelected.adminName} • {new Date(activeSelected.createdAt).toLocaleString('ru-RU')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => window.print()} className="p-2 hover:bg-white/5 rounded-lg text-gray-500">
                    <Printer size={18} />
                  </button>
                  <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-white/5 rounded-lg text-gray-500">
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-5">
                  {/* Status */}
                  <section>
                    <h4 className="text-xs text-gray-500 font-medium mb-3 uppercase tracking-wider">Статус</h4>
                    <div className="flex gap-2 flex-wrap">
                      {['🚨 Срочное', '💭 В процессе', '✅ Сделано'].map(s => (
                        <button
                          key={s}
                          onClick={() => updateOrderStatus(activeSelected.id, s, currentUser.id, currentUser.name)}
                          disabled={!isAdmin && !isAssembler}
                          className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                            activeSelected.status === s ? 'bg-[#e8de8c] text-black' : 'bg-white/[0.04] text-gray-400 hover:bg-white/[0.08]'
                          } disabled:opacity-50`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </section>

                  {/* Door specs */}
                  <section>
                    <h4 className="text-xs text-gray-500 font-medium mb-3 uppercase tracking-wider flex items-center gap-2">
                      <DoorOpen size={12} /> Параметры двери
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {DOOR_FIELDS.map(f => (
                        <div key={f.key} className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.04]">
                          <p className="text-[10px] text-gray-500 uppercase tracking-wider">{f.label}</p>
                          <p className="text-sm font-medium mt-0.5 break-words">{activeSelected[f.key] || '—'}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  {activeSelected.note && (
                    <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl">
                      <p className="text-xs text-amber-400 font-medium mb-1">Примечание</p>
                      <p className="text-sm">{activeSelected.note}</p>
                    </div>
                  )}

                  {/* Client & Payment */}
                  <section>
                    <h4 className="text-xs text-gray-500 font-medium mb-3 uppercase tracking-wider">Клиент и оплата</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 p-3 bg-white/[0.03] rounded-xl">
                        <User size={14} className="text-gray-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Имя</p>
                          <p className="text-sm font-medium">{activeSelected.client?.name || '—'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-white/[0.03] rounded-xl">
                        <Phone size={14} className="text-gray-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Телефон</p>
                          <p className="text-sm font-medium">{activeSelected.client?.phone || '—'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-white/[0.03] rounded-xl">
                        <MapPin size={14} className="text-gray-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Адрес</p>
                          <p className="text-sm font-medium">{activeSelected.client?.address || '—'}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 pt-2">
                        <div className="bg-[#e8de8c]/5 border border-[#e8de8c]/10 rounded-xl p-3">
                          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Цена</p>
                          <p className="text-sm font-bold text-[#e8de8c]">{formatMoney(activeSelected.price)} ₽</p>
                        </div>
                        <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3">
                          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Аванс</p>
                          <p className="text-sm font-bold text-emerald-400">{formatMoney(activeSelected.advance)} ₽</p>
                        </div>
                        <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-3">
                          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Остаток</p>
                          <p className="text-sm font-bold text-red-400">{formatMoney(remaining(activeSelected))} ₽</p>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Photos */}
                  {activeSelected.photos?.length > 0 && (
                    <section>
                      <h4 className="text-xs text-gray-500 font-medium mb-3 uppercase tracking-wider">Фото заказа</h4>
                      <div className="flex flex-wrap gap-2">
                        {activeSelected.photos.map((p, i) => (
                          <img
                            key={i}
                            src={p}
                            onClick={() => setViewImage(p)}
                            className="w-20 h-20 rounded-xl object-cover border border-white/10 cursor-pointer hover:border-[#e8de8c]/40 transition-colors"
                            alt=""
                          />
                        ))}
                      </div>
                    </section>
                  )}
                </div>

                {/* Chat / Response room */}
                <div className="flex flex-col">
                  <h4 className="text-xs text-gray-500 font-medium mb-3 flex items-center gap-1.5 uppercase tracking-wider">
                    <MessageSquare size={12} /> Комната ответа
                  </h4>

                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={() => handleReaction('progress')}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-xl text-xs font-semibold text-blue-400 transition-colors"
                    >
                      <Clock size={14} /> В процессе
                    </button>
                    <button
                      onClick={() => handleReaction('done')}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl text-xs font-semibold text-emerald-400 transition-colors"
                    >
                      <CheckCircle2 size={14} /> Готово
                    </button>
                  </div>

                  <div className="flex-1 bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 flex flex-col gap-3 min-h-[300px]">
                    <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                      {activeSelected.responseRoom?.map((resp, i) => (
                        <div key={i} className={`flex flex-col ${resp.userId === currentUser.id ? 'items-end' : 'items-start'}`}>
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
                                <img
                                  src={resp.image}
                                  onClick={() => setViewImage(resp.image)}
                                  className="max-w-full max-h-48 rounded-lg mb-2 cursor-pointer hover:opacity-80 transition-opacity"
                                  alt=""
                                />
                              )}
                              {resp.message && resp.message !== '📷 Фото' && <p className="text-sm">{resp.message}</p>}
                            </div>
                          )}
                          <span className="text-[10px] text-gray-600 mt-0.5 px-1">
                            {new Date(resp.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))}
                      {(!activeSelected.responseRoom || activeSelected.responseRoom.length === 0) && (
                        <div className="h-full flex flex-col items-center justify-center text-gray-700">
                          <MessageSquare size={28} className="mb-1" />
                          <p className="text-xs">Нет сообщений</p>
                        </div>
                      )}
                    </div>

                    {chatImagePreview && (
                      <div className="relative inline-block">
                        <img src={chatImagePreview} className="h-16 rounded-lg border border-white/10" alt="" />
                        <button
                          onClick={() => { setChatImage(null); setChatImagePreview(null); }}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <input type="file" ref={chatFileRef} accept="image/*" className="hidden" onChange={handleChatImageSelect} />
                      <button
                        onClick={() => chatFileRef.current?.click()}
                        className="p-2.5 bg-white/[0.04] hover:bg-white/[0.08] rounded-xl text-gray-500 hover:text-[#e8de8c] transition-colors shrink-0"
                      >
                        <ImageIcon size={16} />
                      </button>
                      <input
                        type="text"
                        placeholder="Сообщение..."
                        value={chatMessage}
                        onChange={(e) => setChatMessage(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSendChat(); }}
                        className="flex-1 bg-white/[0.04] border border-white/[0.06] rounded-xl py-2.5 px-3 focus:outline-none focus:border-[#e8de8c]/30 text-sm"
                      />
                      <button
                        onClick={handleSendChat}
                        className="p-2.5 bg-[#e8de8c] rounded-xl flex items-center justify-center text-black hover:bg-[#d4cb7a] transition-colors shrink-0"
                      >
                        <Send size={14} />
                      </button>
                    </div>
                  </div>

                  {isAssembler && !activeSelected.status?.includes('✅') && (
                    <button
                      onClick={() => updateOrderStatus(activeSelected.id, '✅ Сделано', currentUser.id, currentUser.name)}
                      className="mt-3 w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
                    >
                      <CheckCircle2 size={18} /> Отметить готовым
                    </button>
                  )}
                  {isAdmin && activeSelected.status?.includes('✅') && (
                    <button
                      onClick={() => { markShipped(activeSelected.id); setSelectedOrder(null); }}
                      className="mt-3 w-full bg-[#e8de8c] hover:bg-[#d4cb7a] text-black font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
                    >
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
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-[#111114] border border-white/10 rounded-2xl shadow-2xl relative z-10"
            >
              <form onSubmit={handleCreateOrder} className="flex flex-col max-h-[92vh]">
                <div className="p-5 border-b border-white/[0.06] flex items-center justify-between shrink-0">
                  <div>
                    <h2 className="text-lg font-bold">Новый заказ</h2>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-[#e8de8c] font-semibold">Код: #{nextOrderNumber}</span>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Calendar size={10} /> {new Date().toLocaleString('ru-RU')}
                      </span>
                    </div>
                  </div>
                  <button type="button" onClick={() => setIsAddModalOpen(false)} className="p-1.5 hover:bg-white/5 rounded-lg">
                    <X size={20} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                  {/* Door specs */}
                  <section>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <DoorOpen size={12} /> Параметры двери
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] text-gray-500 font-medium mb-1 block uppercase tracking-wider">
                          Модель <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          value={newOrder.model}
                          onChange={(e) => updateField('model', e.target.value)}
                          className={`w-full bg-white/[0.04] border rounded-xl p-3 focus:outline-none text-sm transition-colors ${
                            errors.model ? 'border-red-500/50 focus:border-red-500' : 'border-white/[0.06] focus:border-[#e8de8c]/30'
                          }`}
                          placeholder="Название модели"
                        />
                        <FieldError msg={errors.model} />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500 font-medium mb-1 block uppercase tracking-wider">
                          Размер <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          value={newOrder.size}
                          onChange={(e) => updateField('size', e.target.value)}
                          className={`w-full bg-white/[0.04] border rounded-xl p-3 focus:outline-none text-sm transition-colors ${
                            errors.size ? 'border-red-500/50 focus:border-red-500' : 'border-white/[0.06] focus:border-[#e8de8c]/30'
                          }`}
                          placeholder="Напр. 2050x860"
                        />
                        <FieldError msg={errors.size} />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500 font-medium mb-1 block uppercase tracking-wider">Полотно</label>
                        <select
                          value={newOrder.canvas}
                          onChange={(e) => updateField('canvas', e.target.value)}
                          className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl p-3 focus:outline-none focus:border-[#e8de8c]/30 text-sm appearance-none"
                        >
                          <option value="">Не выбрано</option>
                          {CANVAS_OPTIONS.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500 font-medium mb-1 block uppercase tracking-wider">Цвет</label>
                        <input
                          type="text"
                          value={newOrder.color}
                          onChange={(e) => updateField('color', e.target.value)}
                          className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl p-3 focus:outline-none focus:border-[#e8de8c]/30 text-sm"
                          placeholder="Напр. Венге"
                        />
                      </div>
                      {DOOR_FIELDS.filter(f => !['model', 'size', 'canvas', 'color'].includes(f.key)).map(f => (
                        <div key={f.key}>
                          <label className="text-[10px] text-gray-500 font-medium mb-1 block uppercase tracking-wider">{f.label}</label>
                          <input
                            type="text"
                            value={newOrder[f.key]}
                            onChange={(e) => updateField(f.key, e.target.value)}
                            className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl p-3 focus:outline-none focus:border-[#e8de8c]/30 text-sm"
                          />
                        </div>
                      ))}
                    </div>
                  </section>

                  <section>
                    <label className="text-[10px] text-gray-500 font-medium mb-1 block uppercase tracking-wider">Примечание</label>
                    <textarea
                      value={newOrder.note}
                      onChange={(e) => updateField('note', e.target.value)}
                      className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl p-3 focus:outline-none focus:border-[#e8de8c]/30 text-sm h-20 resize-none"
                      placeholder="Дополнительные детали..."
                    />
                  </section>

                  <div className="h-px bg-white/[0.06]" />

                  {/* Client & Payment */}
                  <section>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <User size={12} /> Клиент и оплата
                    </h3>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] text-gray-500 font-medium mb-1 block uppercase tracking-wider">
                            Имя <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="text"
                            value={newOrder.client.name}
                            onChange={(e) => updateClient('name', e.target.value)}
                            className={`w-full bg-white/[0.04] border rounded-xl p-3 focus:outline-none text-sm transition-colors ${
                              errors.clientName ? 'border-red-500/50 focus:border-red-500' : 'border-white/[0.06] focus:border-[#e8de8c]/30'
                            }`}
                            placeholder="ФИО клиента"
                          />
                          <FieldError msg={errors.clientName} />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-500 font-medium mb-1 block uppercase tracking-wider">Номер клиента</label>
                          <input
                            type="tel"
                            inputMode="tel"
                            value={newOrder.client.phone}
                            onChange={(e) => updateClient('phone', e.target.value)}
                            className={`w-full bg-white/[0.04] border rounded-xl p-3 focus:outline-none text-sm transition-colors ${
                              errors.clientPhone ? 'border-red-500/50 focus:border-red-500' : 'border-white/[0.06] focus:border-[#e8de8c]/30'
                            }`}
                            placeholder="+7 (___) ___-__-__"
                          />
                          <FieldError msg={errors.clientPhone} />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500 font-medium mb-1 block uppercase tracking-wider">Адрес клиента</label>
                        <input
                          type="text"
                          value={newOrder.client.address}
                          onChange={(e) => updateClient('address', e.target.value)}
                          className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl p-3 focus:outline-none focus:border-[#e8de8c]/30 text-sm"
                          placeholder="Город, улица, дом, квартира"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] text-gray-500 font-medium mb-1 block uppercase tracking-wider">
                            Цена (₽) <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={newOrder.price}
                            onChange={(e) => updatePrice('price', e.target.value)}
                            className={`w-full bg-[#e8de8c]/5 border rounded-xl p-3 focus:outline-none text-sm font-semibold transition-colors ${
                              errors.price ? 'border-red-500/50 focus:border-red-500' : 'border-[#e8de8c]/10 focus:border-[#e8de8c]/30'
                            }`}
                            placeholder="0"
                          />
                          <FieldError msg={errors.price} />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-500 font-medium mb-1 block uppercase tracking-wider">Аванс (₽)</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={newOrder.advance}
                            onChange={(e) => updatePrice('advance', e.target.value)}
                            className={`w-full bg-emerald-500/5 border rounded-xl p-3 focus:outline-none text-sm font-semibold transition-colors ${
                              errors.advance ? 'border-red-500/50 focus:border-red-500' : 'border-emerald-500/10 focus:border-emerald-500/30'
                            }`}
                            placeholder="0"
                          />
                          <FieldError msg={errors.advance} />
                        </div>
                      </div>
                    </div>
                  </section>

                  <div className="h-px bg-white/[0.06]" />

                  {/* Optional */}
                  <section>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Дополнительно</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] text-gray-500 font-medium mb-1 block uppercase tracking-wider">Оптовик (необязательно)</label>
                        <select
                          value={newOrder.wholesalerId}
                          onChange={(e) => updateField('wholesalerId', e.target.value)}
                          className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl p-3 focus:outline-none focus:border-[#e8de8c]/30 text-sm text-gray-300 appearance-none"
                        >
                          <option value="">Розничный</option>
                          {wholesalers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] text-gray-500 font-medium mb-1 block uppercase tracking-wider">Фото заказа</label>
                        <input type="file" ref={orderPhotoRef} accept="image/*" multiple className="hidden" onChange={handleOrderPhoto} />
                        <div className="flex items-center gap-2 flex-wrap">
                          {newOrder.photos.map((p, i) => (
                            <div key={i} className="relative">
                              <img src={p} className="w-16 h-16 rounded-lg object-cover border border-white/10" alt="" />
                              <button
                                type="button"
                                onClick={() => setNewOrder(prev => ({ ...prev, photos: prev.photos.filter((_, j) => j !== i) }))}
                                className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white"
                              >
                                <X size={8} />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => orderPhotoRef.current?.click()}
                            className="w-16 h-16 bg-white/[0.04] hover:bg-white/[0.08] border border-dashed border-white/10 rounded-lg flex flex-col items-center justify-center text-gray-500 hover:text-[#e8de8c] transition-colors"
                          >
                            <ImageIcon size={18} />
                            <span className="text-[8px] mt-0.5">Добавить</span>
                          </button>
                        </div>
                      </div>

                      <label className="flex items-center gap-3 cursor-pointer">
                        <div className="relative">
                          <input type="checkbox" checked={newOrder.isUrgent} onChange={(e) => updateField('isUrgent', e.target.checked)} className="sr-only" />
                          <div className={`w-10 h-5 rounded-full transition-colors ${newOrder.isUrgent ? 'bg-red-500' : 'bg-white/10'}`} />
                          <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${newOrder.isUrgent ? 'translate-x-5' : ''}`} />
                        </div>
                        <span className={`text-sm font-medium ${newOrder.isUrgent ? 'text-red-400' : 'text-gray-500'}`}>
                          {newOrder.isUrgent ? '🚨 Срочный заказ' : 'Обычный заказ'}
                        </span>
                      </label>
                    </div>
                  </section>
                </div>

                <div className="p-5 border-t border-white/[0.06] flex items-center justify-between shrink-0">
                  <div>
                    <p className="text-xs text-gray-500">Остаток к оплате</p>
                    <p className="text-lg font-bold">
                      {formatMoney(Math.max(0, parseMoneyInput(newOrder.price) - parseMoneyInput(newOrder.advance)))} ₽
                    </p>
                  </div>
                  <button
                    type="submit"
                    className="px-8 py-3 bg-[#e8de8c] hover:bg-[#d4cb7a] text-black font-semibold rounded-xl transition-colors text-sm"
                  >
                    Создать заказ
                  </button>
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
