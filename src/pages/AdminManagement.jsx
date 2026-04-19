import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import {
  UserPlus, Search, Shield, Trash2, X, Eye, EyeOff, Package, ShoppingCart, Wrench, Settings, AlertCircle, Hammer, Flame, Paintbrush, Ruler, Zap
} from 'lucide-react';
import { required, minLength } from '../lib/validation';
import { ROLES, getRoleLabel } from '../lib/roles';

const AdminManagement = () => {
  const { users, addUser, deleteUser, currentUser, updateSelf } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showPasswords, setShowPasswords] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({ name: '', password: '', role: 'admin' });
  const [formErrors, setFormErrors] = useState({});

  const [profileData, setProfileData] = useState({ name: currentUser?.name || '', password: '' });
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [showProfilePassword, setShowProfilePassword] = useState(false);

  const handleProfileSave = (e) => {
    e.preventDefault();
    setProfileError('');
    const updates = {};
    const trimmedName = profileData.name.trim();
    const trimmedPw = profileData.password.trim();

    if (trimmedName) {
      if (trimmedName.length < 2) {
        setProfileError('Имя: минимум 2 символа');
        return;
      }
      const duplicate = users.find(u => u.id !== currentUser.id && u.name.toLowerCase() === trimmedName.toLowerCase());
      if (duplicate) {
        setProfileError('Имя уже занято другим сотрудником');
        return;
      }
      updates.name = trimmedName;
    }
    if (trimmedPw) {
      if (trimmedPw.length < 3) {
        setProfileError('Пароль: минимум 3 символа');
        return;
      }
      updates.password = trimmedPw;
    }
    if (Object.keys(updates).length > 0) {
      updateSelf(updates);
      setProfileSuccess(true);
      setProfileData(prev => ({ ...prev, password: '' }));
      setTimeout(() => setProfileSuccess(false), 3000);
    }
  };

  const filteredUsers = users.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const togglePasswordVisibility = (id) => setShowPasswords(prev => ({ ...prev, [id]: !prev[id] }));

  const validateNewUser = (data) => {
    const errs = {};
    const nameErr = required(data.name, 'Имя') || minLength(data.name, 2, 'Имя');
    if (nameErr) errs.name = nameErr;
    else {
      const dup = users.find(u => u.name.toLowerCase() === data.name.trim().toLowerCase());
      if (dup) errs.name = 'Имя уже занято';
    }
    const pwErr = required(data.password, 'Пароль') || minLength(data.password, 3, 'Пароль');
    if (pwErr) errs.password = pwErr;
    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validateNewUser(formData);
    setFormErrors(errs);
    if (Object.keys(errs).length > 0) return;
    addUser({ ...formData, name: formData.name.trim(), password: formData.password.trim() });
    setIsModalOpen(false);
    setFormData({ name: '', password: '', role: 'admin' });
    setFormErrors({});
  };

  const updateForm = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    if (formErrors[key]) setFormErrors(prev => ({ ...prev, [key]: null }));
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'superadmin': return <Shield className="text-[#e8de8c]" size={16} />;
      case 'admin': return <ShoppingCart className="text-blue-400" size={16} />;
      case 'designer': return <Ruler className="text-cyan-400" size={16} />;
      case 'laser_operator': return <Zap className="text-fuchsia-400" size={16} />;
      case 'bender_operator': return <Hammer className="text-orange-400" size={16} />;
      case 'welder': return <Flame className="text-red-400" size={16} />;
      case 'painter': return <Paintbrush className="text-pink-400" size={16} />;
      case 'assembler': return <Wrench className="text-emerald-400" size={16} />;
      case 'warehouse': return <Package className="text-amber-400" size={16} />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Управление</h1>
          <p className="text-gray-500 text-sm mt-1">Персонал и настройки</p>
        </div>
        <button onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 bg-[#e8de8c] hover:bg-[#d4cb7a] text-black font-semibold rounded-xl transition-colors flex items-center gap-2 text-sm">
          <UserPlus size={16} /> Создать аккаунт
        </button>
      </div>

      {/* Profile card */}
      <div className="bg-[#111114] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-white/[0.06] flex items-center gap-3">
          <div className="w-9 h-9 bg-[#e8de8c]/10 rounded-xl flex items-center justify-center text-[#e8de8c]">
            <Settings size={18} />
          </div>
          <div>
            <h2 className="font-semibold">Мой профиль</h2>
            <p className="text-xs text-gray-500">Изменить свои данные</p>
          </div>
        </div>
        <form onSubmit={handleProfileSave} className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 font-medium mb-1 block">Имя входа</label>
              <input type="text" value={profileData.name}
                onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl py-3 px-4 focus:outline-none focus:border-[#e8de8c]/30 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium mb-1 block">Новый пароль</label>
              <div className="relative">
                <input type={showProfilePassword ? 'text' : 'password'} value={profileData.password}
                  onChange={(e) => setProfileData({ ...profileData, password: e.target.value })}
                  className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl py-3 pl-4 pr-10 focus:outline-none focus:border-[#e8de8c]/30 text-sm" placeholder="Новый пароль..." />
                <button type="button" onClick={() => setShowProfilePassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                  {showProfilePassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3 flex-wrap">
            <button type="submit" className="px-6 py-2.5 bg-[#e8de8c] hover:bg-[#d4cb7a] text-black font-semibold rounded-xl text-sm transition-colors">
              Сохранить
            </button>
            {profileSuccess && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-emerald-400 text-sm font-medium">
                Сохранено
              </motion.span>
            )}
            {profileError && (
              <span className="text-red-400 text-sm font-medium flex items-center gap-1">
                <AlertCircle size={13} /> {profileError}
              </span>
            )}
          </div>
        </form>
      </div>

      {/* Users table */}
      <div className="bg-[#111114] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-white/[0.06] flex items-center justify-between">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
            <input type="text" placeholder="Поиск..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl py-2.5 pl-9 pr-4 focus:outline-none focus:border-[#e8de8c]/30 text-sm" />
          </div>
          <span className="text-xs text-gray-500">{users.length} сотрудников</span>
        </div>

        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/[0.04]">
              <th className="px-5 py-3 text-xs font-medium text-gray-500">Сотрудник</th>
              <th className="px-5 py-3 text-xs font-medium text-gray-500">Роль</th>
              <th className="px-5 py-3 text-xs font-medium text-gray-500">Пароль</th>
              <th className="px-5 py-3 text-xs font-medium text-gray-500 text-right">Действия</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((u) => (
              <tr key={u.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors group">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-white/[0.04] rounded-lg flex items-center justify-center text-gray-400 font-semibold group-hover:bg-[#e8de8c]/10 group-hover:text-[#e8de8c] transition-colors">
                      {u.name[0]}
                    </div>
                    <span className="font-medium">{u.name}</span>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    {getRoleIcon(u.role)}
                    <span className="text-sm text-gray-400">{getRoleLabel(u.role)}</span>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <code className="text-sm text-gray-400 bg-white/[0.04] px-2 py-1 rounded-lg font-mono">
                      {showPasswords[u.id] ? u.password : '••••'}
                    </code>
                    <button onClick={() => togglePasswordVisibility(u.id)} className="text-gray-500 hover:text-white p-1">
                      {showPasswords[u.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </td>
                <td className="px-5 py-4 text-right">
                  {u.role !== 'superadmin' && (
                    <button
                      onClick={() => {
                        if (window.confirm(`Удалить сотрудника "${u.name}"?`)) deleteUser(u.id);
                      }}
                      className="p-2 hover:bg-red-500/10 rounded-lg text-gray-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
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
                  <h2 className="text-lg font-bold">Новый пользователь</h2>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-white/5 rounded-lg"><X size={20} /></button>
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <label className="text-xs text-gray-500 font-medium mb-1 block">Имя <span className="text-red-400">*</span></label>
                    <input type="text" value={formData.name} onChange={(e) => updateForm('name', e.target.value)}
                      className={`w-full bg-white/[0.04] border rounded-xl p-3 focus:outline-none text-sm ${
                        formErrors.name ? 'border-red-500/50' : 'border-white/[0.06] focus:border-[#e8de8c]/30'
                      }`} placeholder="Имя сотрудника" />
                    {formErrors.name && (
                      <p className="text-[11px] text-red-400 mt-1 flex items-center gap-1">
                        <AlertCircle size={11} /> {formErrors.name}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-medium mb-1 block">Пароль <span className="text-red-400">*</span></label>
                    <input type="text" value={formData.password} onChange={(e) => updateForm('password', e.target.value)}
                      className={`w-full bg-white/[0.04] border rounded-xl p-3 focus:outline-none text-sm ${
                        formErrors.password ? 'border-red-500/50' : 'border-white/[0.06] focus:border-[#e8de8c]/30'
                      }`} placeholder="Пароль (минимум 3 символа)" />
                    {formErrors.password && (
                      <p className="text-[11px] text-red-400 mt-1 flex items-center gap-1">
                        <AlertCircle size={11} /> {formErrors.password}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-medium mb-1 block">Роль</label>
                    <select value={formData.role} onChange={(e) => updateForm('role', e.target.value)}
                      className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl p-3 focus:outline-none focus:border-[#e8de8c]/30 text-sm text-gray-300 appearance-none">
                      {ROLES.map(r => (
                        <option key={r.key} value={r.key}>{r.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="p-5 border-t border-white/[0.06] flex gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)}
                    className="flex-1 bg-white/[0.04] hover:bg-white/[0.08] text-white font-medium py-3 rounded-xl text-sm">Отмена</button>
                  <button type="submit"
                    className="flex-[2] bg-[#e8de8c] hover:bg-[#d4cb7a] text-black font-semibold py-3 rounded-xl text-sm">Создать</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminManagement;
