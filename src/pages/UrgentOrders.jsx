import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Calendar, Clock, DoorOpen, Search } from 'lucide-react';
import { useOrders } from '../context/OrderContext';
import { useAuth } from '../context/AuthContext';
import { hasPermission } from '../lib/permissions';
import {
  daysLeftFor,
  deadlineLabel,
  deadlineSeverity,
  isDeadlineHit,
} from '../lib/deadlines';

const formatMoney = (v) => Number(v || 0).toLocaleString('ru-RU');

const UrgentOrders = () => {
  const { orders } = useOrders();
  const { currentUser, users } = useAuth();
  const navigate = useNavigate();
  const canSeeClient = hasPermission(currentUser, 'client_info');

  const [searchTerm, setSearchTerm] = useState('');

  const isSuperAdmin = currentUser?.role === 'superadmin';
  const isAdmin = currentUser?.role === 'admin' || isSuperAdmin;

  const superadminIds = users
    .filter((u) => u.role === 'superadmin')
    .map((u) => u.id);
  const visible = useMemo(() => {
    const now = new Date();
    const scoped = isSuperAdmin || isAdmin
      ? orders
      : orders.filter(
          (o) => o.adminId === currentUser?.id || superadminIds.includes(o.adminId),
        );
    const filtered = scoped.filter((o) => isDeadlineHit(o, now));
    // Most overdue first (largest negative daysLeft at the top).
    filtered.sort((a, b) => {
      const la = daysLeftFor(a, now) ?? 0;
      const lb = daysLeftFor(b, now) ?? 0;
      return la - lb;
    });
    if (!searchTerm.trim()) return filtered;
    const q = searchTerm.trim().toLowerCase();
    return filtered.filter((o) => {
      return (
        String(o.code || '').includes(q) ||
        (o.client?.name || '').toLowerCase().includes(q) ||
        (o.client?.phone || '').toLowerCase().includes(q) ||
        (o.model || '').toLowerCase().includes(q)
      );
    });
  }, [orders, searchTerm, currentUser, isSuperAdmin, isAdmin, superadminIds]);

  const overdueCount = useMemo(() => {
    const now = new Date();
    return visible.filter((o) => (daysLeftFor(o, now) ?? 0) < 0).length;
  }, [visible]);

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            Срочные заказы
            <span className="px-2.5 py-0.5 bg-red-500/15 text-red-300 text-sm font-semibold rounded-lg">
              {visible.length}
            </span>
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Заказы, у которых срок истёк или истекает сегодня
          </p>
        </div>
        {overdueCount > 0 && (
          <div className="px-4 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
            <AlertTriangle size={16} className="text-red-400" />
            <p className="text-xs font-semibold text-red-300">
              Просроченных: {overdueCount}
            </p>
          </div>
        )}
      </div>

      <div className="bg-[#1a1a20] border border-white/10 rounded-2xl p-3">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600"
            size={16}
          />
          <input
            type="text"
            placeholder="Поиск по коду, клиенту, модели, телефону..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl py-2.5 pl-9 pr-4 focus:outline-none focus:border-[#e8de8c]/30 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <AnimatePresence>
          {visible.map((order, idx) => {
            const now = new Date();
            const left = daysLeftFor(order, now);
            const sev = deadlineSeverity(left);
            const label = deadlineLabel(left);
            const isOverdue = sev === 'overdue';
            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: Math.min(idx * 0.02, 0.15), duration: 0.2 }}
                onClick={() =>
                  navigate(`/orders?open=${order.id}`, {
                    state: { fromUrgent: true },
                  })
                }
                className="cursor-pointer rounded-2xl p-5 bg-red-600 border-2 border-red-300 hover:border-white shadow-2xl shadow-red-900/60 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-white text-red-700 flex items-center justify-center text-sm font-bold shrink-0">
                      #{order.code}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold truncate text-white">
                        {order.client?.name || `Заказ #${order.code}`}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs mt-0.5 text-red-100">
                        <Calendar size={10} />
                        {new Date(order.createdAt).toLocaleDateString('ru-RU')}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 ${
                      isOverdue
                        ? 'bg-black text-red-300 border border-red-300/40'
                        : 'bg-white text-red-700 animate-pulse'
                    }`}
                  >
                    {label}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="rounded-lg px-3 py-2 bg-black/30">
                    <p className="text-[10px] text-red-100 flex items-center gap-1">
                      <DoorOpen size={10} /> Модель
                    </p>
                    <p className="text-sm font-medium truncate text-white">
                      {order.model || '—'}
                    </p>
                  </div>
                  <div className="rounded-lg px-3 py-2 bg-black/30">
                    <p className="text-[10px] text-red-100">Размер</p>
                    <p className="text-sm font-medium truncate text-white">
                      {order.size || '—'}
                    </p>
                  </div>
                  <div className="rounded-lg px-3 py-2 bg-black/30">
                    <p className="text-[10px] text-red-100">Статус</p>
                    <p className="text-sm font-medium truncate text-white">
                      {order.status || '—'}
                    </p>
                  </div>
                </div>

                {canSeeClient && (
                  <div className="mt-4 grid grid-cols-3 gap-2 pt-4 border-t border-red-300/30">
                    <div className="min-w-0">
                      <p className="text-[10px] text-red-100">Телефон</p>
                      <p className="text-xs font-medium truncate text-white">
                        {order.client?.phone || '—'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-red-100">Цена</p>
                      <p className="text-sm font-bold text-white">
                        {formatMoney(order.price)} ₽
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-red-100">Остаток</p>
                      <p className="text-sm font-bold text-white">
                        {formatMoney(
                          Math.max(0, (order.price || 0) - (order.advance || 0)),
                        )}{' '}
                        ₽
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {visible.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center text-center text-gray-600">
            <Clock size={40} className="mb-3 opacity-40" />
            <p className="text-sm font-medium">Срочных заказов нет</p>
            <p className="text-xs text-gray-700 mt-1">
              Здесь появятся заказы, у которых срок готовности истёк
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UrgentOrders;
