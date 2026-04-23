import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOrders } from '../context/OrderContext';
import { useAuth } from '../context/AuthContext';
import { Plus, Search, User, Phone, Edit2, Trash2, X, Package, TrendingUp, AlertCircle, ChevronRight, Calendar, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { formatPhone, isValidPhone, required, minLength } from '../lib/validation';
import { hasPermission } from '../lib/permissions';

const formatMoney = (v) => Number(v || 0).toLocaleString('ru-RU');

const statusBadgeClass = (status) => {
  if (!status) return 'bg-blue-500/10 text-blue-400';
  if (status.includes('✅')) return 'bg-emerald-500/10 text-emerald-400';
  if (status.includes('🚨')) return 'bg-red-500/10 text-red-400';
  return 'bg-blue-500/10 text-blue-400';
};

const Wholesalers = () => {
  const { wholesalers, addWholesaler, updateWholesaler, deleteWholesaler, orders } = useOrders();
  const { currentUser } = useAuth();
  const canManage = hasPermission(currentUser, 'manage_wholesalers');
  const canSeeClient = hasPermission(currentUser, 'client_info');

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({ name: '', phone: '', info: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [viewingWholesaler, setViewingWholesaler] = useState(null);

  const filteredWholesalers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return wholesalers;
    return wholesalers.filter(w =>
      (w.name || '').toLowerCase().includes(q) ||
      (w.phone || '').toLowerCase().includes(q)
    );
  }, [wholesalers, searchTerm]);

  const validate = (data) => {
    const errs = {};
    const nameErr = required(data.name, 'Имя') || minLength(data.name, 2, 'Имя');
    if (nameErr) errs.name = nameErr;
    const phoneErr = required(data.phone, 'Телефон');
    if (phoneErr) errs.phone = phoneErr;
    else if (!isValidPhone(data.phone)) errs.phone = 'Введите полный номер телефона';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canManage) return;
    const errs = validate(formData);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const payload = { ...formData, name: formData.name.trim() };
    setSaving(true);
    try {
      if (editingItem) await updateWholesaler(editingItem.id, payload);
      else await addWholesaler(payload);
      setIsModalOpen(false);
      setEditingItem(null);
      setFormData({ name: '', phone: '', info: '' });
      setErrors({});
    } catch (err) {
      console.error(err);
      setErrors({ name: 'Не удалось сохранить' });
    } finally {
      setSaving(false);
    }
  };

  const updateForm = (key, value) => {
    const v = key === 'phone' ? formatPhone(value) : value;
    setFormData(prev => ({ ...prev, [key]: v }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: null }));
  };

  const openAdd = () => {
    setEditingItem(null);
    setFormData({ name: '', phone: '', info: '' });
    setErrors({});
    setIsModalOpen(true);
  };

  const openEdit = (w) => {
    setEditingItem(w);
    setFormData({ name: w.name, phone: formatPhone(w.phone), info: w.info || '' });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleDelete = (w) => {
    if (!canManage) return;
    if (!window.confirm(`Удалить оптовика "${w.name}"?`)) return;
    deleteWholesaler(w.id);
  };

  const getActiveOrders = (wid) => orders.filter(o => o.wholesaler?.id === wid);
  const getOrderCount = (wid) => getActiveOrders(wid).length;
  const getTotalSpent = (wid) => getActiveOrders(wid).reduce((acc, o) => acc + (o.price || o.total || 0), 0);
  const getReadyCount = (wid) => getActiveOrders(wid).filter(o => o.status?.includes('✅')).length;

  const viewingOrders = viewingWholesaler ? getActiveOrders(viewingWholesaler.id) : [];

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Оптовики</h1>
          <p className="text-gray-500 text-sm mt-1">База постоянных клиентов</p>
        </div>
        {canManage && (
          <button onClick={openAdd}
            className="px-4 py-2.5 bg-[#e8de8c] hover:bg-[#d4cb7a] text-black font-semibold rounded-xl transition-colors flex items-center gap-2 text-sm">
            <Plus size={16} /> Добавить оптовика
          </button>
        )}
      </div>

      <div className="bg-[#111114] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-white/[0.06]">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
            <input type="text" placeholder="Поиск по имени или телефону..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl py-2.5 pl-9 pr-4 focus:outline-none focus:border-[#e8de8c]/30 text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
          <AnimatePresence mode="popLayout">
            {filteredWholesalers.map((w, idx) => {
              const ordersCount = getOrderCount(w.id);
              const readyCount = getReadyCount(w.id);
              return (
                <motion.div layout key={w.id}
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: Math.min(idx * 0.03, 0.3) }}
                  className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 hover:border-[#e8de8c]/20 transition-all group">
                  <button
                    type="button"
                    onClick={() => setViewingWholesaler(w)}
                    className="w-full text-left"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-11 h-11 bg-[#e8de8c]/10 rounded-xl flex items-center justify-center text-[#e8de8c] shrink-0">
                        <User size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate group-hover:text-[#e8de8c] transition-colors">{w.name}</h3>
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><Phone size={10} /> {w.phone}</p>
                      </div>
                      <ChevronRight size={16} className="text-gray-600 group-hover:text-[#e8de8c] transition-colors shrink-0" />
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="p-2.5 bg-white/[0.03] rounded-lg">
                        <p className="text-[10px] text-gray-500 mb-0.5">Активных</p>
                        <p className="text-sm font-semibold flex items-center gap-1"><Package size={12} className="text-[#e8de8c]" />{ordersCount}</p>
                      </div>
                      <div className="p-2.5 bg-white/[0.03] rounded-lg">
                        <p className="text-[10px] text-gray-500 mb-0.5">Готовых</p>
                        <p className="text-sm font-semibold flex items-center gap-1">
                          <CheckCircle2 size={12} className="text-emerald-400" />{readyCount}
                        </p>
                      </div>
                    </div>

                    {canSeeClient && (
                      <div className="p-2.5 bg-white/[0.03] rounded-lg mb-3">
                        <p className="text-[10px] text-gray-500 mb-0.5">Сумма активных</p>
                        <p className="text-sm font-semibold flex items-center gap-1"><TrendingUp size={12} className="text-emerald-400" />{formatMoney(getTotalSpent(w.id))} ₽</p>
                      </div>
                    )}

                    {w.info && (
                      <div className="p-2.5 bg-[#e8de8c]/5 rounded-lg mb-3">
                        <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">{w.info}</p>
                      </div>
                    )}
                  </button>

                  {canManage && (
                    <div className="flex items-center gap-2">
                      <button onClick={(e) => { e.stopPropagation(); openEdit(w); }}
                        className="flex-1 bg-white/[0.04] hover:bg-[#e8de8c]/10 text-xs font-medium py-2 rounded-lg transition-colors text-gray-400 hover:text-[#e8de8c] flex items-center justify-center gap-1.5">
                        <Edit2 size={12} /> Изменить
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(w); }}
                        className="p-2 bg-white/[0.04] hover:bg-red-500/10 text-gray-500 hover:text-red-400 rounded-lg transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>

          {filteredWholesalers.length === 0 && (
            <div className="col-span-full py-16 flex flex-col items-center text-center text-gray-600">
              <User size={32} className="mb-2 opacity-40" />
              <p className="text-sm">{searchTerm ? 'Ничего не найдено' : 'Оптовиков пока нет'}</p>
              {canManage && !searchTerm && (
                <button onClick={openAdd} className="mt-3 text-xs text-[#e8de8c] font-semibold hover:underline">
                  + Добавить первого
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Orders drill-down */}
      <AnimatePresence>
        {viewingWholesaler && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setViewingWholesaler(null)} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative z-10 w-full max-w-2xl bg-[#111114] border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[92vh]">
              <div className="p-5 border-b border-white/[0.06] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 bg-[#e8de8c]/10 rounded-xl flex items-center justify-center text-[#e8de8c] shrink-0">
                    <User size={20} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-bold truncate">{viewingWholesaler.name}</h2>
                    <p className="text-xs text-gray-500 flex items-center gap-1"><Phone size={10} /> {viewingWholesaler.phone}</p>
                  </div>
                </div>
                <button onClick={() => setViewingWholesaler(null)} className="p-2 hover:bg-white/5 rounded-lg text-gray-500">
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                {viewingOrders.length === 0 && (
                  <div className="py-12 flex flex-col items-center text-center text-gray-600">
                    <Package size={32} className="mb-2 opacity-40" />
                    <p className="text-sm">Нет активных заказов у этого оптовика</p>
                  </div>
                )}
                {viewingOrders.map(o => (
                  <div key={o.id} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 bg-[#e8de8c]/10 rounded-lg flex items-center justify-center text-[#e8de8c] font-bold text-sm shrink-0">
                          #{o.code}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{o.model || 'Без модели'}</p>
                          <p className="text-[11px] text-gray-500 flex items-center gap-1">
                            <Calendar size={10} />
                            {new Date(o.createdAt).toLocaleDateString('ru-RU')}
                          </p>
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-lg text-[11px] font-medium shrink-0 ${statusBadgeClass(o.status)}`}>{o.status}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                      <div className="bg-white/[0.03] rounded-lg px-2.5 py-1.5">
                        <p className="text-[10px] text-gray-500">Размер</p>
                        <p className="text-xs font-medium truncate">{o.size || '—'}</p>
                      </div>
                      <div className="bg-white/[0.03] rounded-lg px-2.5 py-1.5">
                        <p className="text-[10px] text-gray-500">Цвет</p>
                        <p className="text-xs font-medium truncate">{o.color || '—'}</p>
                      </div>
                      {canSeeClient ? (
                        <div className="bg-white/[0.03] rounded-lg px-2.5 py-1.5">
                          <p className="text-[10px] text-gray-500">Цена</p>
                          <p className="text-xs font-bold text-[#e8de8c]">{formatMoney(o.price || o.total)} ₽</p>
                        </div>
                      ) : (
                        <div className="bg-white/[0.03] rounded-lg px-2.5 py-1.5">
                          <p className="text-[10px] text-gray-500">Полотно</p>
                          <p className="text-xs font-medium truncate">{o.canvas || '—'}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add/Edit modal */}
      <AnimatePresence>
        {isModalOpen && canManage && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#111114] border border-white/10 rounded-2xl shadow-2xl relative z-10">
              <form onSubmit={handleSubmit}>
                <div className="p-5 border-b border-white/[0.06] flex items-center justify-between">
                  <h2 className="text-lg font-bold">{editingItem ? 'Редактировать' : 'Новый оптовик'}</h2>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-white/5 rounded-lg"><X size={20} /></button>
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <label className="text-xs text-gray-500 font-medium mb-1 block">Имя <span className="text-red-400">*</span></label>
                    <input type="text" value={formData.name} onChange={(e) => updateForm('name', e.target.value)}
                      className={`w-full bg-white/[0.04] border rounded-xl p-3 focus:outline-none text-sm ${
                        errors.name ? 'border-red-500/50' : 'border-white/[0.06] focus:border-[#e8de8c]/30'
                      }`} placeholder="ФИО" />
                    {errors.name && <p className="text-[11px] text-red-400 mt-1 flex items-center gap-1"><AlertCircle size={11} /> {errors.name}</p>}
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-medium mb-1 block">Телефон <span className="text-red-400">*</span></label>
                    <input type="tel" inputMode="tel" value={formData.phone} onChange={(e) => updateForm('phone', e.target.value)}
                      className={`w-full bg-white/[0.04] border rounded-xl p-3 focus:outline-none text-sm ${
                        errors.phone ? 'border-red-500/50' : 'border-white/[0.06] focus:border-[#e8de8c]/30'
                      }`} placeholder="+7 (___) ___-__-__" />
                    {errors.phone && <p className="text-[11px] text-red-400 mt-1 flex items-center gap-1"><AlertCircle size={11} /> {errors.phone}</p>}
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-medium mb-1 block">Информация</label>
                    <textarea value={formData.info} onChange={(e) => updateForm('info', e.target.value)}
                      className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl p-3 focus:outline-none focus:border-[#e8de8c]/30 h-20 resize-none text-sm" placeholder="Скидки, адрес..." />
                  </div>
                </div>
                <div className="p-5 border-t border-white/[0.06] flex gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)}
                    className="flex-1 bg-white/[0.04] hover:bg-white/[0.08] text-white font-medium py-3 rounded-xl text-sm">Отмена</button>
                  <button type="submit" disabled={saving}
                    className="flex-[2] bg-[#e8de8c] hover:bg-[#d4cb7a] disabled:opacity-50 text-black font-semibold py-3 rounded-xl text-sm">
                    {saving ? 'Сохранение...' : (editingItem ? 'Сохранить' : 'Добавить')}
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

export default Wholesalers;
