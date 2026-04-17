import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOrders } from '../context/OrderContext';
import { useAuth } from '../context/AuthContext';
import {
  Plus, Search, Package, Trash2, Edit2, X, FileDown, AlertTriangle, TrendingUp, DollarSign, AlertCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { required, positiveInteger, nonNegativeNumber, formatMoneyInput, parseMoneyInput } from '../lib/validation';

const WarehousePage = () => {
  const { inventory, addInventoryItem, updateInventoryItem, deleteInventoryItem } = useOrders();
  const { currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({ name: '', qty: '', price: '' });
  const [errors, setErrors] = useState({});

  const filteredInventory = inventory.filter(i =>
    i.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExportExcel = () => {
    const data = inventory.map(item => ({
      'Наименование товара': item.name,
      'Количество (шт.)': item.qty,
      'Цена за единицу (₽)': item.price,
      'Общая стоимость (₽)': item.price * item.qty
    }));
    // Итоговая строка
    data.push({
      'Наименование товара': 'ИТОГО',
      'Количество (шт.)': inventory.reduce((acc, i) => acc + i.qty, 0),
      'Цена за единицу (₽)': '',
      'Общая стоимость (₽)': inventory.reduce((acc, i) => acc + (i.price * i.qty), 0)
    });
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [{ wch: 30 }, { wch: 18 }, { wch: 22 }, { wch: 22 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Склад");
    XLSX.writeFile(wb, `DOORMAN_Склад_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const validate = (data) => {
    const errs = {};
    const nameErr = required(data.name, 'Наименование');
    if (nameErr) errs.name = nameErr;
    const qty = parseMoneyInput(data.qty);
    const price = parseMoneyInput(data.price);
    const qtyErr = positiveInteger(qty, 'Количество');
    if (qtyErr) errs.qty = qtyErr;
    const priceErr = nonNegativeNumber(price, 'Цена');
    if (priceErr) errs.price = priceErr;
    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate(formData);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const payload = {
      name: formData.name.trim(),
      qty: parseMoneyInput(formData.qty),
      price: parseMoneyInput(formData.price),
    };
    if (editingItem) updateInventoryItem(editingItem.id, payload);
    else addInventoryItem(payload);
    setIsModalOpen(false);
    setEditingItem(null);
    setFormData({ name: '', qty: '', price: '' });
    setErrors({});
  };

  const updateForm = (key, value) => {
    const v = key === 'qty' || key === 'price' ? formatMoneyInput(value) : value;
    setFormData(prev => ({ ...prev, [key]: v }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: null }));
  };

  const stats = [
    { label: 'Всего наименований на складе', value: inventory.length, icon: Package, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Общая стоимость остатков', value: `${inventory.reduce((acc, i) => acc + (i.price * i.qty), 0).toLocaleString()} ₽`, icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Общее количество товаров (шт.)', value: inventory.reduce((acc, i) => acc + i.qty, 0), icon: TrendingUp, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  ];

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Склад</h1>
          <p className="text-gray-500 text-sm mt-1">Управление остатками и товарами</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportExcel}
            className="px-4 py-2.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-gray-300 font-medium rounded-xl transition-colors flex items-center gap-2 text-sm">
            <FileDown size={16} /> Excel
          </button>
          <button
            onClick={() => { setEditingItem(null); setFormData({ name: '', qty: '', price: '' }); setErrors({}); setIsModalOpen(true); }}
            className="px-4 py-2.5 bg-[#e8de8c] hover:bg-[#d4cb7a] text-black font-semibold rounded-xl transition-colors flex items-center gap-2 text-sm">
            <Plus size={16} /> Добавить товар
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
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

      {/* Table */}
      <div className="bg-[#111114] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-white/[0.06]">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
            <input type="text" placeholder="Поиск товара..." value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl py-2.5 pl-9 pr-4 focus:outline-none focus:border-[#e8de8c]/30 transition-colors text-sm" />
          </div>
        </div>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/[0.04]">
              <th className="px-5 py-3 text-xs font-medium text-gray-500">Наименование</th>
              <th className="px-5 py-3 text-xs font-medium text-gray-500">Количество</th>
              <th className="px-5 py-3 text-xs font-medium text-gray-500">Цена за ед.</th>
              <th className="px-5 py-3 text-xs font-medium text-gray-500 text-right">Действия</th>
            </tr>
          </thead>
          <tbody>
            {filteredInventory.map((item) => (
              <tr key={item.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors group">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-white/[0.04] rounded-lg flex items-center justify-center text-gray-500 group-hover:text-[#e8de8c] group-hover:bg-[#e8de8c]/10 transition-colors">
                      <Package size={16} />
                    </div>
                    <span className="font-medium">{item.name}</span>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold ${item.qty < 5 ? 'text-red-400' : ''}`}>{item.qty}</span>
                    {item.qty < 5 && <AlertTriangle size={14} className="text-red-400" />}
                  </div>
                </td>
                <td className="px-5 py-4 text-sm text-gray-300 font-medium">{item.price.toLocaleString()} ₽</td>
                <td className="px-5 py-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => { setEditingItem(item); setFormData({ name: item.name, qty: formatMoneyInput(item.qty), price: formatMoneyInput(item.price) }); setErrors({}); setIsModalOpen(true); }}
                      className="p-2 hover:bg-white/[0.06] rounded-lg text-gray-500 hover:text-blue-400 transition-colors">
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => { if (window.confirm(`Удалить товар "${item.name}"?`)) deleteInventoryItem(item.id); }}
                      className="p-2 hover:bg-red-500/10 rounded-lg text-gray-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
                  <h2 className="text-lg font-bold">{editingItem ? 'Редактировать' : 'Новый товар'}</h2>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-white/5 rounded-lg"><X size={20} /></button>
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <label className="text-xs text-gray-500 font-medium mb-1 block">Наименование <span className="text-red-400">*</span></label>
                    <input type="text" value={formData.name} onChange={(e) => updateForm('name', e.target.value)}
                      className={`w-full bg-white/[0.04] border rounded-xl p-3 focus:outline-none text-sm ${
                        errors.name ? 'border-red-500/50' : 'border-white/[0.06] focus:border-[#e8de8c]/30'
                      }`} placeholder="Напр. Дверь стальная" />
                    {errors.name && <p className="text-[11px] text-red-400 mt-1 flex items-center gap-1"><AlertCircle size={11} /> {errors.name}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 font-medium mb-1 block">Количество <span className="text-red-400">*</span></label>
                      <input type="text" inputMode="numeric" value={formData.qty} onChange={(e) => updateForm('qty', e.target.value)}
                        className={`w-full bg-white/[0.04] border rounded-xl p-3 focus:outline-none text-sm ${
                          errors.qty ? 'border-red-500/50' : 'border-white/[0.06] focus:border-[#e8de8c]/30'
                        }`} placeholder="0" />
                      {errors.qty && <p className="text-[11px] text-red-400 mt-1 flex items-center gap-1"><AlertCircle size={11} /> {errors.qty}</p>}
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 font-medium mb-1 block">Цена за ед. (₽) <span className="text-red-400">*</span></label>
                      <input type="text" inputMode="numeric" value={formData.price} onChange={(e) => updateForm('price', e.target.value)}
                        className={`w-full bg-white/[0.04] border rounded-xl p-3 focus:outline-none text-sm ${
                          errors.price ? 'border-red-500/50' : 'border-white/[0.06] focus:border-[#e8de8c]/30'
                        }`} placeholder="0" />
                      {errors.price && <p className="text-[11px] text-red-400 mt-1 flex items-center gap-1"><AlertCircle size={11} /> {errors.price}</p>}
                    </div>
                  </div>
                </div>
                <div className="p-5 border-t border-white/[0.06] flex gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)}
                    className="flex-1 bg-white/[0.04] hover:bg-white/[0.08] text-white font-medium py-3 rounded-xl transition-colors text-sm">Отмена</button>
                  <button type="submit"
                    className="flex-[2] bg-[#e8de8c] hover:bg-[#d4cb7a] text-black font-semibold py-3 rounded-xl transition-colors text-sm">
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

export default WarehousePage;
