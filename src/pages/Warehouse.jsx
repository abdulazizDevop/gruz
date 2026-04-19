import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOrders } from '../context/OrderContext';
import {
  Plus, Search, Package, Trash2, Edit2, X, FileDown, AlertTriangle, TrendingUp, DollarSign, AlertCircle, DoorOpen, DoorClosed, ImagePlus, Loader2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { required, positiveInteger, nonNegativeNumber, formatMoneyInput, parseMoneyInput } from '../lib/validation';
import { uploadImage } from '../lib/uploads';
import ImageLightbox from '../components/ImageLightbox';

const CATEGORIES = [
  { key: 'single', label: 'Одностворчатые', icon: DoorClosed },
  { key: 'double', label: 'Двустворчатые', icon: DoorOpen },
];

const getItemCategory = (item) => item?.category || 'single';

const WarehousePage = () => {
  const { inventory, addInventoryItem, updateInventoryItem, deleteInventoryItem } = useOrders();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('single');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({ name: '', qty: '', price: '', category: 'single', imageUrl: '' });
  const [errors, setErrors] = useState({});
  const [uploading, setUploading] = useState(false);
  const [viewImage, setViewImage] = useState(null);
  const fileInputRef = useRef(null);

  const categoryInventory = inventory.filter(i => getItemCategory(i) === activeCategory);
  const filteredInventory = categoryInventory.filter(i =>
    i.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const catCount = (cat) => inventory.filter(i => getItemCategory(i) === cat).reduce((acc, i) => acc + (i.qty || 0), 0);

  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file);
      setFormData(prev => ({ ...prev, imageUrl: url }));
    } catch (err) {
      console.error('Upload failed', err);
      window.alert('Не удалось загрузить фото');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleExportExcel = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const absolute = (url) => {
      if (!url) return '';
      if (url.startsWith('data:') || url.startsWith('http')) return url;
      return origin + url;
    };
    const data = inventory.map(item => ({
      'Наименование двери': item.name,
      'Полотно': CATEGORIES.find(c => c.key === getItemCategory(item))?.label || '—',
      'Количество (шт.)': item.qty || 0,
      'Цена за единицу (₽)': item.price || 0,
      'Общая стоимость (₽)': (item.price || 0) * (item.qty || 0),
      'Фото': absolute(item.imageUrl),
    }));
    data.push({
      'Наименование двери': 'ИТОГО',
      'Полотно': '',
      'Количество (шт.)': inventory.reduce((acc, i) => acc + (i.qty || 0), 0),
      'Цена за единицу (₽)': '',
      'Общая стоимость (₽)': inventory.reduce((acc, i) => acc + ((i.price || 0) * (i.qty || 0)), 0),
      'Фото': '',
    });
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [{ wch: 30 }, { wch: 18 }, { wch: 18 }, { wch: 22 }, { wch: 22 }, { wch: 40 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Склад');
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
      category: formData.category || 'single',
      imageUrl: formData.imageUrl || '',
    };
    if (editingItem) updateInventoryItem(editingItem.id, payload);
    else addInventoryItem(payload);
    setIsModalOpen(false);
    setEditingItem(null);
    setFormData({ name: '', qty: '', price: '', category: activeCategory, imageUrl: '' });
    setErrors({});
  };

  const updateForm = (key, value) => {
    const v = key === 'qty' || key === 'price' ? formatMoneyInput(value) : value;
    setFormData(prev => ({ ...prev, [key]: v }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: null }));
  };

  const openAdd = () => {
    setEditingItem(null);
    setFormData({ name: '', qty: '', price: '', category: activeCategory, imageUrl: '' });
    setErrors({});
    setIsModalOpen(true);
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      qty: formatMoneyInput(item.qty),
      price: formatMoneyInput(item.price),
      category: getItemCategory(item),
      imageUrl: item.imageUrl || '',
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const categoryStats = [
    {
      label: 'Наименований в категории',
      value: categoryInventory.length,
      icon: Package,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'Стоимость остатков',
      value: `${categoryInventory.reduce((acc, i) => acc + ((i.price || 0) * (i.qty || 0)), 0).toLocaleString('ru-RU')} ₽`,
      icon: DollarSign,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
    {
      label: 'Всего дверей (шт.)',
      value: categoryInventory.reduce((acc, i) => acc + (i.qty || 0), 0),
      icon: TrendingUp,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
    },
  ];

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Склад</h1>
          <p className="text-gray-500 text-sm mt-1">Свободная продажа дверей</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportExcel}
            className="px-4 py-2.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-gray-300 font-medium rounded-xl transition-colors flex items-center gap-2 text-sm">
            <FileDown size={16} /> Excel
          </button>
          <button
            onClick={openAdd}
            className="px-4 py-2.5 bg-[#e8de8c] hover:bg-[#d4cb7a] text-black font-semibold rounded-xl transition-colors flex items-center gap-2 text-sm">
            <Plus size={16} /> Добавить дверь
          </button>
        </div>
      </div>

      {/* Category tabs */}
      <div className="bg-[#111114] border border-white/[0.06] rounded-2xl p-1.5 flex gap-1.5">
        {CATEGORIES.map(cat => {
          const Icon = cat.icon;
          const active = activeCategory === cat.key;
          const count = catCount(cat.key);
          return (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
                active ? 'bg-[#e8de8c] text-black' : 'text-gray-400 hover:bg-white/[0.04]'
              }`}
            >
              <Icon size={16} />
              <span className="hidden sm:inline">{cat.label}</span>
              <span className="sm:hidden">{cat.key === 'single' ? '1-ств.' : '2-ств.'}</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                active ? 'bg-black/20' : 'bg-white/[0.06]'
              }`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {categoryStats.map((s, i) => (
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
            <input type="text" placeholder="Поиск двери..." value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl py-2.5 pl-9 pr-4 focus:outline-none focus:border-[#e8de8c]/30 transition-colors text-sm" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[560px]">
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
                      {item.imageUrl ? (
                        <button
                          type="button"
                          onClick={() => setViewImage(item.imageUrl)}
                          className="w-11 h-11 rounded-lg overflow-hidden border border-white/10 hover:border-[#e8de8c]/40 transition-colors shrink-0"
                        >
                          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                        </button>
                      ) : (
                        <div className="w-11 h-11 bg-white/[0.04] rounded-lg flex items-center justify-center text-gray-500 group-hover:text-[#e8de8c] group-hover:bg-[#e8de8c]/10 transition-colors shrink-0">
                          <Package size={16} />
                        </div>
                      )}
                      <span className="font-medium">{item.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold ${(item.qty || 0) < 5 ? 'text-red-400' : ''}`}>{item.qty || 0}</span>
                      {(item.qty || 0) < 5 && <AlertTriangle size={14} className="text-red-400" />}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-300 font-medium">{(item.price || 0).toLocaleString('ru-RU')} ₽</td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(item)}
                        className="p-2 hover:bg-white/[0.06] rounded-lg text-gray-500 hover:text-blue-400 transition-colors">
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => { if (window.confirm(`Удалить дверь "${item.name}"?`)) deleteInventoryItem(item.id); }}
                        className="p-2 hover:bg-red-500/10 rounded-lg text-gray-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredInventory.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-5 py-16 text-center text-gray-600">
                    <Package size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-medium">В этой категории пока нет дверей</p>
                    <button onClick={openAdd} className="mt-3 text-xs text-[#e8de8c] font-semibold hover:underline">
                      + Добавить первую
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#111114] border border-white/10 rounded-2xl shadow-2xl relative z-10">
              <form onSubmit={handleSubmit}>
                <div className="p-5 border-b border-white/[0.06] flex items-center justify-between">
                  <h2 className="text-lg font-bold">{editingItem ? 'Редактировать' : 'Новая дверь'}</h2>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-white/5 rounded-lg"><X size={20} /></button>
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <label className="text-xs text-gray-500 font-medium mb-1 block">Фото двери</label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoSelect}
                    />
                    {formData.imageUrl ? (
                      <div className="relative inline-block">
                        <button
                          type="button"
                          onClick={() => setViewImage(formData.imageUrl)}
                          className="block rounded-xl overflow-hidden border border-white/10 hover:border-[#e8de8c]/40 transition-colors"
                        >
                          <img src={formData.imageUrl} alt="" className="w-24 h-24 object-cover" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white shadow-lg"
                        >
                          <X size={11} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="w-24 h-24 bg-white/[0.04] hover:bg-white/[0.08] border border-dashed border-white/10 hover:border-[#e8de8c]/30 rounded-xl flex flex-col items-center justify-center text-gray-500 hover:text-[#e8de8c] transition-colors disabled:opacity-60"
                      >
                        {uploading ? (
                          <Loader2 size={20} className="animate-spin" />
                        ) : (
                          <>
                            <ImagePlus size={20} />
                            <span className="text-[10px] mt-1">Добавить</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-medium mb-1 block">Полотно <span className="text-red-400">*</span></label>
                    <div className="grid grid-cols-2 gap-2">
                      {CATEGORIES.map(cat => {
                        const Icon = cat.icon;
                        const active = formData.category === cat.key;
                        return (
                          <button
                            key={cat.key}
                            type="button"
                            onClick={() => updateForm('category', cat.key)}
                            className={`px-3 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 border transition-colors ${
                              active
                                ? 'bg-[#e8de8c]/10 text-[#e8de8c] border-[#e8de8c]/30'
                                : 'bg-white/[0.04] text-gray-400 border-white/[0.06] hover:bg-white/[0.06]'
                            }`}
                          >
                            <Icon size={14} /> {cat.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-medium mb-1 block">Наименование <span className="text-red-400">*</span></label>
                    <input type="text" value={formData.name} onChange={(e) => updateForm('name', e.target.value)}
                      className={`w-full bg-white/[0.04] border rounded-xl p-3 focus:outline-none text-sm ${
                        errors.name ? 'border-red-500/50' : 'border-white/[0.06] focus:border-[#e8de8c]/30'
                      }`} placeholder="Напр. Дверь Стандарт" />
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

      <ImageLightbox src={viewImage} onClose={() => setViewImage(null)} />
    </div>
  );
};

export default WarehousePage;
