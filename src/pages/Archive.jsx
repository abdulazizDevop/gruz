import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOrders } from '../context/OrderContext';
import { useAuth } from '../context/AuthContext';
import {
  Search, Archive as ArchiveIcon, FileDown, Calendar, Phone, MapPin, User,
  DoorOpen, Truck, X, Package, TrendingUp, DollarSign, Users as UsersIcon
} from 'lucide-react';
import * as XLSX from 'xlsx';
import ImageLightbox from '../components/ImageLightbox';

const formatMoney = (v) => Number(v || 0).toLocaleString('ru-RU');

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

const getClientName = (s) => s.client?.name || s.clientName || 'Без имени';
const getClientPhone = (s) => s.client?.phone || s.clientPhone || '';
const getClientAddress = (s) => s.client?.address || s.clientAddress || '';
const getPrice = (s) => s.price || s.total || 0;

const Archive = () => {
  const { salesHistory } = useOrders();
  const { currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selected, setSelected] = useState(null);
  const [viewImage, setViewImage] = useState(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const isSuperAdmin = currentUser?.role === 'superadmin';

  const visible = useMemo(() => {
    let list = salesHistory;
    if (!isSuperAdmin) {
      list = list.filter(s => !s.adminId || s.adminId === currentUser?.id);
    }
    if (fromDate) {
      const from = new Date(fromDate).getTime();
      list = list.filter(s => new Date(s.shippedAt || 0).getTime() >= from);
    }
    if (toDate) {
      const to = new Date(toDate).getTime() + 24 * 60 * 60 * 1000;
      list = list.filter(s => new Date(s.shippedAt || 0).getTime() < to);
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(s =>
        String(s.code || '').includes(searchTerm) ||
        getClientName(s).toLowerCase().includes(q) ||
        getClientPhone(s).toLowerCase().includes(q) ||
        (s.model || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [salesHistory, searchTerm, fromDate, toDate, currentUser, isSuperAdmin]);

  const stats = useMemo(() => {
    const totalRevenue = visible.reduce((acc, s) => acc + getPrice(s), 0);
    const uniqueClients = new Set(
      visible.map(s => `${getClientName(s)}|${getClientPhone(s)}`).filter(k => k !== 'Без имени|')
    ).size;
    return [
      { label: 'Продано дверей', value: visible.length, icon: Package, color: 'text-blue-400', bg: 'bg-blue-500/10' },
      { label: 'Сумма продаж', value: `${formatMoney(totalRevenue)} ₽`, icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
      { label: 'Уникальных клиентов', value: uniqueClients, icon: UsersIcon, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    ];
  }, [visible]);

  const handleExport = () => {
    const rows = visible.map(s => ({
      'Код': s.code || '',
      'Клиент': getClientName(s),
      'Телефон': getClientPhone(s),
      'Адрес': getClientAddress(s),
      'Модель': s.model || '',
      'Размер': s.size || '',
      'Полотно': s.canvas || '',
      'Цвет': s.color || '',
      'Цена (₽)': getPrice(s),
      'Аванс (₽)': s.advance || 0,
      'Админ': s.adminName || '',
      'Сборщик': s.assemblerName || '',
      'Оптовик': s.wholesaler?.name || '',
      'Создано': s.createdAt ? new Date(s.createdAt).toLocaleString('ru-RU') : '',
      'Отгружено': s.shippedAt ? new Date(s.shippedAt).toLocaleString('ru-RU') : '',
    }));
    if (rows.length === 0) rows.push({ 'Код': '—' });
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 8 }, { wch: 22 }, { wch: 18 }, { wch: 32 }, { wch: 20 }, { wch: 14 },
      { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 16 },
      { wch: 18 }, { wch: 20 }, { wch: 20 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Архив');
    XLSX.writeFile(wb, `DOORMAN_Архив_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            Архив
            <span className="px-2.5 py-0.5 bg-[#e8de8c]/10 text-[#e8de8c] text-sm font-semibold rounded-lg">
              {visible.length}
            </span>
          </h1>
          <p className="text-gray-500 text-sm mt-1">Отгруженные заказы и история клиентов</p>
        </div>
        <button
          onClick={handleExport}
          disabled={visible.length === 0}
          className="px-4 py-2.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-gray-300 font-medium rounded-xl transition-colors flex items-center gap-2 text-sm disabled:opacity-50"
        >
          <FileDown size={16} /> Excel
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((s, i) => (
          <div key={i} className="bg-[#111114] border border-white/[0.06] rounded-2xl p-5 flex items-center gap-4">
            <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center ${s.color}`}>
              <s.icon size={20} />
            </div>
            <div>
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className="text-xl font-bold">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-[#111114] border border-white/[0.06] rounded-2xl p-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
          <input
            type="text"
            placeholder="Поиск по коду, клиенту, модели, телефону..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl py-2.5 pl-9 pr-4 focus:outline-none focus:border-[#e8de8c]/30 text-sm"
          />
        </div>
        <div className="flex gap-2">
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="bg-white/[0.04] border border-white/[0.06] rounded-xl py-2.5 px-3 focus:outline-none focus:border-[#e8de8c]/30 text-sm text-gray-300 min-w-[140px]"
          />
          <span className="self-center text-gray-500 text-sm">—</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="bg-white/[0.04] border border-white/[0.06] rounded-xl py-2.5 px-3 focus:outline-none focus:border-[#e8de8c]/30 text-sm text-gray-300 min-w-[140px]"
          />
          {(fromDate || toDate) && (
            <button
              type="button"
              onClick={() => { setFromDate(''); setToDate(''); }}
              className="px-3 py-2 text-xs text-gray-500 hover:text-white hover:bg-white/5 rounded-lg"
            >
              Сбросить
            </button>
          )}
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {visible.map((s, idx) => (
            <motion.div
              layout
              key={s.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: Math.min(idx * 0.02, 0.3) }}
              onClick={() => setSelected(s)}
              className="bg-[#111114] border border-white/[0.06] rounded-2xl p-5 hover:border-emerald-500/20 transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400 text-sm font-bold">
                    #{s.code || '—'}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold truncate group-hover:text-[#e8de8c] transition-colors">
                      {getClientName(s)}
                    </h3>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <Truck size={10} />
                      {s.shippedAt ? new Date(s.shippedAt).toLocaleDateString('ru-RU') : '—'}
                    </p>
                  </div>
                </div>
                <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold rounded-lg shrink-0">
                  Отгружено
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-3">
                <div className="bg-white/[0.03] rounded-lg px-2.5 py-2">
                  <p className="text-[10px] text-gray-500">Модель</p>
                  <p className="text-xs font-medium truncate">{s.model || '—'}</p>
                </div>
                <div className="bg-white/[0.03] rounded-lg px-2.5 py-2">
                  <p className="text-[10px] text-gray-500">Размер</p>
                  <p className="text-xs font-medium truncate">{s.size || '—'}</p>
                </div>
                <div className="bg-white/[0.03] rounded-lg px-2.5 py-2">
                  <p className="text-[10px] text-gray-500">Цвет</p>
                  <p className="text-xs font-medium truncate">{s.color || '—'}</p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/[0.04] flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-[10px] text-gray-500">Телефон</p>
                  <p className="text-xs font-medium truncate">{getClientPhone(s) || '—'}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-500">Сумма</p>
                  <p className="text-base font-bold text-emerald-400">{formatMoney(getPrice(s))} ₽</p>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {visible.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center text-center text-gray-600">
            <ArchiveIcon size={40} className="mb-3 opacity-50" />
            <p className="text-sm font-medium">
              {salesHistory.length === 0 ? 'Архив пуст' : 'Ничего не найдено'}
            </p>
            <p className="text-xs text-gray-700 mt-1">
              {salesHistory.length === 0 ? 'Отгруженные заказы появятся здесь' : 'Попробуйте изменить фильтры'}
            </p>
          </div>
        )}
      </div>

      {/* Detail modal */}
      <AnimatePresence>
        {selected && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelected(null)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-3xl bg-[#111114] border border-white/10 rounded-2xl shadow-2xl relative z-10 flex flex-col max-h-[92vh]"
            >
              <div className="p-5 border-b border-white/[0.06] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400 font-bold">
                    #{selected.code || '—'}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold truncate">{getClientName(selected)}</h2>
                    <p className="text-xs text-gray-500 flex items-center gap-2 flex-wrap">
                      {selected.createdAt && (
                        <span className="flex items-center gap-1">
                          <Calendar size={10} /> создан {new Date(selected.createdAt).toLocaleDateString('ru-RU')}
                        </span>
                      )}
                      {selected.shippedAt && (
                        <span className="flex items-center gap-1 text-emerald-400">
                          <Truck size={10} /> отгружен {new Date(selected.shippedAt).toLocaleDateString('ru-RU')}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <button onClick={() => setSelected(null)} className="p-2 hover:bg-white/5 rounded-lg text-gray-500">
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                <section>
                  <h4 className="text-xs text-gray-500 font-medium mb-3 uppercase tracking-wider flex items-center gap-2">
                    <DoorOpen size={12} /> Параметры двери
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {DOOR_FIELDS.map(f => (
                      <div key={f.key} className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.04]">
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider">{f.label}</p>
                        <p className="text-sm font-medium mt-0.5 break-words">{selected[f.key] || '—'}</p>
                      </div>
                    ))}
                  </div>
                </section>

                {selected.note && (
                  <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl">
                    <p className="text-xs text-amber-400 font-medium mb-1">Примечание</p>
                    <p className="text-sm">{selected.note}</p>
                  </div>
                )}

                <section>
                  <h4 className="text-xs text-gray-500 font-medium mb-3 uppercase tracking-wider">Клиент и оплата</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 p-3 bg-white/[0.03] rounded-xl">
                      <User size={14} className="text-gray-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider">Имя</p>
                        <p className="text-sm font-medium">{getClientName(selected)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white/[0.03] rounded-xl">
                      <Phone size={14} className="text-gray-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider">Телефон</p>
                        <p className="text-sm font-medium">{getClientPhone(selected) || '—'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white/[0.03] rounded-xl">
                      <MapPin size={14} className="text-gray-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider">Адрес</p>
                        <p className="text-sm font-medium">{getClientAddress(selected) || '—'}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-2">
                      <div className="bg-[#e8de8c]/5 border border-[#e8de8c]/10 rounded-xl p-3">
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider">Цена</p>
                        <p className="text-sm font-bold text-[#e8de8c]">{formatMoney(getPrice(selected))} ₽</p>
                      </div>
                      <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3">
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider">Аванс</p>
                        <p className="text-sm font-bold text-emerald-400">{formatMoney(selected.advance)} ₽</p>
                      </div>
                      <div className="bg-white/[0.04] rounded-xl p-3">
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider">Оптовик</p>
                        <p className="text-sm font-medium truncate">{selected.wholesaler?.name || 'Розница'}</p>
                      </div>
                    </div>
                  </div>
                </section>

                {(selected.adminName || selected.assemblerName) && (
                  <section>
                    <h4 className="text-xs text-gray-500 font-medium mb-3 uppercase tracking-wider">Команда</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {selected.adminName && (
                        <div className="bg-white/[0.03] rounded-xl p-3">
                          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Админ</p>
                          <p className="text-sm font-medium">{selected.adminName}</p>
                        </div>
                      )}
                      {selected.assemblerName && (
                        <div className="bg-white/[0.03] rounded-xl p-3">
                          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Сборщик</p>
                          <p className="text-sm font-medium">{selected.assemblerName}</p>
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {selected.photos?.length > 0 && (
                  <section>
                    <h4 className="text-xs text-gray-500 font-medium mb-3 uppercase tracking-wider">Фото заказа</h4>
                    <div className="flex flex-wrap gap-2">
                      {selected.photos.map((p, i) => (
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
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ImageLightbox src={viewImage} onClose={() => setViewImage(null)} />
    </div>
  );
};

export default Archive;
