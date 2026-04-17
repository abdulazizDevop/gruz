import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOrders } from '../context/OrderContext';
import { useAuth } from '../context/AuthContext';
import { Plus, Search, User, Phone, Info, Edit2, Trash2, X, Package, TrendingUp } from 'lucide-react';

const Wholesalers = () => {
  const { wholesalers, addWholesaler, updateWholesaler, deleteWholesaler, orders } = useOrders();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({ name: '', phone: '', info: '' });

  const filteredWholesalers = wholesalers.filter(w =>
    w.name.toLowerCase().includes(searchTerm.toLowerCase()) || w.phone.includes(searchTerm)
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingItem) updateWholesaler(editingItem.id, formData);
    else addWholesaler(formData);
    setIsModalOpen(false); setEditingItem(null); setFormData({ name: '', phone: '', info: '' });
  };

  const getOrderCount = (wid) => orders.filter(o => o.wholesaler?.id === wid).length;
  const getTotalSpent = (wid) => orders.filter(o => o.wholesaler?.id === wid).reduce((acc, o) => acc + (o.total || 0), 0);

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Оптовики</h1>
          <p className="text-gray-500 text-sm mt-1">База постоянных клиентов</p>
        </div>
        <button onClick={() => { setEditingItem(null); setFormData({ name: '', phone: '', info: '' }); setIsModalOpen(true); }}
          className="px-4 py-2.5 bg-[#e8de8c] hover:bg-[#d4cb7a] text-black font-semibold rounded-xl transition-colors flex items-center gap-2 text-sm">
          <Plus size={16} /> Добавить оптовика
        </button>
      </div>

      <div className="bg-[#111114] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-white/[0.06]">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
            <input type="text" placeholder="Поиск..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl py-2.5 pl-9 pr-4 focus:outline-none focus:border-[#e8de8c]/30 text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
          <AnimatePresence mode="popLayout">
            {filteredWholesalers.map((w, idx) => (
              <motion.div layout key={w.id}
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: idx * 0.03 }}
                className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 hover:border-[#e8de8c]/20 transition-all group">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 bg-[#e8de8c]/10 rounded-xl flex items-center justify-center text-[#e8de8c]">
                    <User size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate group-hover:text-[#e8de8c] transition-colors">{w.name}</h3>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><Phone size={10} /> {w.phone}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="p-2.5 bg-white/[0.03] rounded-lg">
                    <p className="text-[10px] text-gray-500 mb-0.5">Заказов</p>
                    <p className="text-sm font-semibold flex items-center gap-1"><Package size={12} className="text-[#e8de8c]" />{getOrderCount(w.id)}</p>
                  </div>
                  <div className="p-2.5 bg-white/[0.03] rounded-lg">
                    <p className="text-[10px] text-gray-500 mb-0.5">Сумма</p>
                    <p className="text-sm font-semibold flex items-center gap-1"><TrendingUp size={12} className="text-emerald-400" />{getTotalSpent(w.id).toLocaleString()} ₽</p>
                  </div>
                </div>

                {w.info && (
                  <div className="p-2.5 bg-[#e8de8c]/5 rounded-lg mb-4">
                    <p className="text-xs text-gray-400 leading-relaxed">{w.info}</p>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button onClick={() => { setEditingItem(w); setFormData({ name: w.name, phone: w.phone, info: w.info }); setIsModalOpen(true); }}
                    className="flex-1 bg-white/[0.04] hover:bg-[#e8de8c]/10 text-xs font-medium py-2 rounded-lg transition-colors text-gray-400 hover:text-[#e8de8c] flex items-center justify-center gap-1.5">
                    <Edit2 size={12} /> Изменить
                  </button>
                  <button onClick={() => deleteWholesaler(w.id)}
                    className="p-2 bg-white/[0.04] hover:bg-red-500/10 text-gray-500 hover:text-red-400 rounded-lg transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
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
                    <label className="text-xs text-gray-500 font-medium mb-1 block">Имя</label>
                    <input required type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl p-3 focus:outline-none focus:border-[#e8de8c]/30 text-sm" placeholder="ФИО" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-medium mb-1 block">Телефон</label>
                    <input required type="text" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl p-3 focus:outline-none focus:border-[#e8de8c]/30 text-sm" placeholder="+7..." />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-medium mb-1 block">Информация</label>
                    <textarea value={formData.info} onChange={(e) => setFormData({...formData, info: e.target.value})}
                      className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl p-3 focus:outline-none focus:border-[#e8de8c]/30 h-20 resize-none text-sm" placeholder="Скидки, адрес..." />
                  </div>
                </div>
                <div className="p-5 border-t border-white/[0.06] flex gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)}
                    className="flex-1 bg-white/[0.04] hover:bg-white/[0.08] text-white font-medium py-3 rounded-xl text-sm">Отмена</button>
                  <button type="submit"
                    className="flex-[2] bg-[#e8de8c] hover:bg-[#d4cb7a] text-black font-semibold py-3 rounded-xl text-sm">
                    {editingItem ? 'Сохранить' : 'Добавить'}
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
