import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOrders } from '../context/OrderContext';
import { useAuth } from '../context/AuthContext';
import { PackageCheck, Calendar, Clock, AlertCircle, ArrowRight, Warehouse, DoorOpen, Search } from 'lucide-react';
import { hasPermission } from '../lib/permissions';

const formatMoney = (v) => Number(v || 0).toLocaleString('ru-RU');

const ReservedWarehouse = () => {
  const { orders, markShipped } = useOrders();
  const { currentUser } = useAuth();
  const canSeeClient = hasPermission(currentUser, 'client_info');
  const [searchTerm, setSearchTerm] = useState('');

  const reservedOrders = useMemo(() => {
    const base = orders.filter(o => o.status?.includes('✅'));
    if (!searchTerm.trim()) return base;
    const q = searchTerm.trim().toLowerCase();
    return base.filter(o => {
      return (
        String(o.code || '').includes(q) ||
        (o.client?.name || '').toLowerCase().includes(q) ||
        (o.client?.phone || '').toLowerCase().includes(q) ||
        (o.wholesaler?.name || '').toLowerCase().includes(q) ||
        (o.model || '').toLowerCase().includes(q)
      );
    });
  }, [orders, searchTerm]);

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            Заказной склад
            <span className="px-2.5 py-0.5 bg-[#e8de8c]/10 text-[#e8de8c] text-sm font-semibold rounded-lg">{reservedOrders.length}</span>
          </h1>
          <p className="text-gray-500 text-sm mt-1">Готовые к выдаче клиенту</p>
        </div>
        {reservedOrders.length > 0 && (
          <div className="px-4 py-2.5 bg-amber-500/10 border border-amber-500/15 rounded-xl flex items-center gap-3">
            <AlertCircle size={16} className="text-amber-500" />
            <p className="text-xs font-medium text-amber-500">Ожидают отгрузки: {reservedOrders.length}</p>
          </div>
        )}
      </div>

      <div className="bg-[#111114] border border-white/[0.06] rounded-2xl p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
          <input
            type="text"
            placeholder={canSeeClient ? 'Поиск по коду, клиенту, оптовику, модели...' : 'Поиск по коду или модели...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl py-2.5 pl-9 pr-4 focus:outline-none focus:border-[#e8de8c]/30 text-sm"
          />
        </div>
      </div>

      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {reservedOrders.map((order, idx) => {
            const isUrgentOrder = order.isUrgent || order.status?.includes('🚨');
            return (
            <motion.div
              layout
              key={order.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: Math.min(idx * 0.05, 0.3) }}
              className={`rounded-2xl p-6 transition-all group ${
                isUrgentOrder
                  ? 'bg-red-600 border-2 border-red-300 hover:border-white shadow-2xl shadow-red-900/60'
                  : 'bg-[#1a1a20] border border-white/10 hover:border-[#e8de8c]/25 shadow-lg shadow-black/30'
              }`}
            >
              <div className="flex flex-col lg:flex-row items-center gap-6">
                <div className="flex items-center gap-5 w-full lg:w-auto">
                  <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0 ${
                    isUrgentOrder ? 'bg-white text-red-700' : 'bg-emerald-500/10 text-emerald-400'
                  }`}>
                    <PackageCheck size={24} />
                    <span className="text-[8px] font-bold mt-0.5">ГОТОВ</span>
                  </div>
                  <div>
                    <p className={`text-xs font-medium mb-0.5 ${isUrgentOrder ? 'text-white' : 'text-[#e8de8c]'}`}>#{order.code}</p>
                    <h3 className={`text-lg font-bold ${isUrgentOrder ? 'text-white' : ''}`}>
                      {canSeeClient ? (order.client?.name || 'Без имени') : `Заказ #${order.code}`}
                    </h3>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={`text-xs flex items-center gap-1 ${isUrgentOrder ? 'text-red-100' : 'text-gray-500'}`}>
                        <Calendar size={10} /> {new Date(order.createdAt).toLocaleDateString('ru-RU')}
                      </span>
                      <span className={`text-xs flex items-center gap-1 ${isUrgentOrder ? 'text-red-100' : 'text-gray-500'}`}>
                        <Clock size={10} /> {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className={`h-px lg:h-10 w-full lg:w-px ${isUrgentOrder ? 'bg-red-300/40' : 'bg-white/[0.06]'}`} />

                <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-4 w-full">
                  <div>
                    <p className={`text-[10px] mb-1 flex items-center gap-1 ${isUrgentOrder ? 'text-red-100' : 'text-gray-500'}`}><DoorOpen size={10} /> Модель</p>
                    <p className={`text-sm font-medium truncate ${isUrgentOrder ? 'text-white' : ''}`}>{order.model || '—'}</p>
                  </div>
                  <div>
                    <p className={`text-[10px] mb-1 ${isUrgentOrder ? 'text-red-100' : 'text-gray-500'}`}>Размер</p>
                    <p className={`text-sm font-medium truncate ${isUrgentOrder ? 'text-white' : ''}`}>{order.size || '—'}</p>
                  </div>
                  <div>
                    <p className={`text-[10px] mb-1 ${isUrgentOrder ? 'text-red-100' : 'text-gray-500'}`}>Цена</p>
                    <p className={`text-sm font-bold ${isUrgentOrder ? 'text-white' : 'text-[#e8de8c]'}`}>
                      {canSeeClient ? `${formatMoney(order.price)} ₽` : '•••'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => markShipped(order.id)}
                  className="w-full lg:w-auto px-6 py-3 bg-[#e8de8c] hover:bg-[#d4cb7a] text-black font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm shrink-0"
                >
                  Отгрузить <ArrowRight size={16} />
                </button>
              </div>
            </motion.div>
            );
          })}

          {reservedOrders.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-24 flex flex-col items-center text-center"
            >
              <div className="w-16 h-16 bg-white/[0.04] rounded-2xl flex items-center justify-center text-gray-700 mb-4">
                <Warehouse size={32} />
              </div>
              <h3 className="text-lg font-semibold text-gray-500">
                {searchTerm ? 'Ничего не найдено' : 'Склад пуст'}
              </h3>
              <p className="text-sm text-gray-600 mt-1 max-w-xs">
                {searchTerm ? 'Попробуйте изменить запрос' : 'Заказы появятся здесь после отметки сборщиком'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ReservedWarehouse;
