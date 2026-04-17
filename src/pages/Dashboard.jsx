import React from 'react';
import { motion } from 'framer-motion';
import { useOrders } from '../context/OrderContext';
import { useAuth } from '../context/AuthContext';
import * as XLSX from 'xlsx';
import {
  TrendingUp,
  Package,
  ShoppingCart,
  Users,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  FileDown
} from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, trend, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.3 }}
    className="bg-[#111114] border border-white/[0.06] rounded-2xl p-5 hover:border-white/10 transition-colors group"
  >
    <div className="flex items-center justify-between mb-4">
      <div className="w-10 h-10 bg-white/[0.04] rounded-xl flex items-center justify-center text-gray-400 group-hover:text-[#e8de8c] group-hover:bg-[#e8de8c]/10 transition-colors">
        <Icon size={20} />
      </div>
      {trend && (
        <div className={`flex items-center gap-1 text-xs font-medium ${trend > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {trend > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {Math.abs(trend)}%
        </div>
      )}
    </div>
    <p className="text-xs text-gray-500 font-medium mb-1">{title}</p>
    <h3 className="text-2xl font-bold tracking-tight">{value}</h3>
  </motion.div>
);

const Dashboard = () => {
  const { orders, salesHistory, inventory, wholesalers } = useOrders();
  const { currentUser } = useAuth();

  const isSuperAdmin = currentUser?.role === 'superadmin';

  const handleManualBackup = () => {
    // Заказы
    const ordersData = orders.map(o => ({
      'Код заказа': o.code,
      'Клиент': o.client?.name || '',
      'Телефон': o.client?.phone || '',
      'Статус': o.status,
      'Сумма (₽)': o.total || 0,
      'Оптовик': o.wholesaler?.name || 'Розница',
      'Дата создания': new Date(o.createdAt).toLocaleString('ru-RU'),
      'Создал': o.adminName || ''
    }));
    // История продаж
    const salesData = salesHistory.map(s => ({
      'Код заказа': s.code,
      'Клиент': s.clientName || '',
      'Телефон': s.clientPhone || '',
      'Сумма (₽)': s.total || 0,
      'Дата отгрузки': new Date(s.shippedAt).toLocaleString('ru-RU')
    }));
    // Склад
    const inventoryData = inventory.map(i => ({
      'Наименование товара': i.name,
      'Количество (шт.)': i.qty,
      'Цена за единицу (₽)': i.price,
      'Общая стоимость (₽)': i.price * i.qty
    }));
    // Оптовики
    const wholesalersData = wholesalers.map(w => ({
      'Имя': w.name,
      'Телефон': w.phone,
      'Информация': w.info || ''
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ordersData), "Активные заказы");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(salesData), "История продаж");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(inventoryData), "Склад");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(wholesalersData), "Оптовики");
    XLSX.writeFile(wb, `DOORMAN_Бэкап_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const visibleOrders = isSuperAdmin ? orders : orders.filter(o => o.adminId === currentUser?.id);
  const activeSalesTotal = visibleOrders.reduce((acc, o) => acc + (o.total || 0), 0);
  const historySalesTotal = isSuperAdmin ? salesHistory.reduce((acc, s) => acc + (s.total || 0), 0) : 0;
  const totalSales = activeSalesTotal + historySalesTotal;
  const urgentOrders = visibleOrders.filter(o => o.status?.includes('🚨')).length;
  const inProgressOrders = visibleOrders.filter(o => o.status?.includes('💭')).length;
  const doneOrders = visibleOrders.filter(o => o.status?.includes('✅')).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Добро пожаловать, {currentUser?.name}</h1>
          <p className="text-gray-500 text-sm mt-1">Обзор деятельности на сегодня</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-3 py-2 bg-white/[0.04] border border-white/[0.06] rounded-xl flex items-center gap-2 text-sm text-gray-400">
            <Clock size={14} />
            {new Date().toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'long' })}
          </div>
          {isSuperAdmin && (
            <button
              onClick={handleManualBackup}
              className="px-4 py-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-gray-300 font-medium rounded-xl transition-colors flex items-center gap-2 text-sm"
            >
              <FileDown size={16} />
              Бэкап
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Всего активных заказов" value={visibleOrders.length} icon={ShoppingCart} trend={12} delay={0.05} />
        <StatCard title="Общая сумма продаж" value={`${totalSales.toLocaleString()} ₽`} icon={TrendingUp} trend={8} delay={0.1} />
        <StatCard title="Товаров на складе (шт.)" value={inventory.reduce((acc, i) => acc + i.qty, 0)} icon={Package} trend={-2} delay={0.15} />
        <StatCard title="База оптовиков" value={wholesalers.length} icon={Users} trend={5} delay={0.2} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent orders */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="lg:col-span-2 bg-[#111114] border border-white/[0.06] rounded-2xl overflow-hidden"
        >
          <div className="p-5 border-b border-white/[0.06] flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              Последние заказы
              <span className="px-2 py-0.5 bg-[#e8de8c]/10 text-[#e8de8c] text-[10px] rounded-full font-semibold">LIVE</span>
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  <th className="px-5 py-3 text-xs font-medium text-gray-500">Код</th>
                  <th className="px-5 py-3 text-xs font-medium text-gray-500">Клиент</th>
                  <th className="px-5 py-3 text-xs font-medium text-gray-500">Статус</th>
                  <th className="px-5 py-3 text-xs font-medium text-gray-500">Сумма</th>
                  <th className="px-5 py-3 text-xs font-medium text-gray-500 text-right">Дата</th>
                </tr>
              </thead>
              <tbody>
                {visibleOrders.slice(0, 6).map((order) => (
                  <tr key={order.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-4 text-sm font-semibold text-[#e8de8c]">#{order.code}</td>
                    <td className="px-5 py-4">
                      <p className="text-sm font-medium">{order.client?.name || 'Без имени'}</p>
                      <p className="text-xs text-gray-500">{order.wholesaler ? 'Оптовик' : 'Розница'}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${
                        order.status?.includes('✅') ? 'bg-emerald-500/10 text-emerald-400' :
                        order.status?.includes('🚨') ? 'bg-red-500/10 text-red-400' :
                        'bg-blue-500/10 text-blue-400'
                      }`}>{order.status}</span>
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold">{order.total?.toLocaleString()} ₽</td>
                    <td className="px-5 py-4 text-xs text-gray-500 text-right">{new Date(order.createdAt).toLocaleDateString('ru-RU')}</td>
                  </tr>
                ))}
                {visibleOrders.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-5 py-16 text-center text-gray-600">
                      <ShoppingCart size={32} className="mx-auto mb-2 opacity-30" />
                      <p className="text-sm font-medium">Нет активных заказов</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Status distribution */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-[#111114] border border-white/[0.06] rounded-2xl p-5 flex flex-col"
        >
          <h3 className="font-semibold mb-6">Статусы заказов</h3>
          <div className="space-y-5 flex-1">
            {[
              { label: 'В процессе', value: inProgressOrders, color: 'bg-blue-500', text: 'text-blue-400' },
              { label: 'Срочные', value: urgentOrders, color: 'bg-red-500', text: 'text-red-400' },
              { label: 'Готовые', value: doneOrders, color: 'bg-emerald-500', text: 'text-emerald-400' }
            ].map(item => (
              <div key={item.label} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">{item.label}</span>
                  <span className={`font-semibold ${item.text}`}>{item.value}</span>
                </div>
                <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: visibleOrders.length ? `${(item.value / visibleOrders.length) * 100}%` : 0 }}
                    className={`h-full ${item.color} rounded-full`}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 bg-[#e8de8c]/5 border border-[#e8de8c]/10 rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-[#e8de8c]/10 rounded-xl flex items-center justify-center text-[#e8de8c] shrink-0">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold">Эффективность +14%</p>
              <p className="text-xs text-gray-500">К прошлой неделе</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
