import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { Lock, User, ChevronRight } from 'lucide-react';
import { requestNotificationPermission } from '../lib/notifications';
import InstallPWA from '../components/InstallPWA';
import { firstAllowedPath } from '../lib/permissions';

const Login = () => {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, loaded, users } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!loaded) {
      setError('Загрузка базы данных... Подождите пару секунд.');
      return;
    }
    if (!name.trim()) {
      setError('Введите имя пользователя');
      return;
    }
    if (!password) {
      setError('Введите пароль');
      return;
    }
    if (password.length < 3) {
      setError('Пароль слишком короткий (минимум 3 символа)');
      return;
    }
    setIsLoading(true);
    setError('');

    setTimeout(async () => {
      if (login(name.trim(), password)) {
        requestNotificationPermission();
        const fresh = users.find(
          u => u.name.toLowerCase() === name.trim().toLowerCase() && u.password === password
        );
        const target = firstAllowedPath(fresh);
        if (target === '/login') {
          setError('У этого сотрудника нет доступных разделов. Обратитесь к администратору.');
          setIsLoading(false);
          return;
        }
        navigate(target, { replace: true });
      } else {
        setError('Неверное имя пользователя или пароль');
        setIsLoading(false);
      }
    }, 400);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
        className="w-full max-w-[440px] relative z-10"
      >
        <div className="bg-[#111114]/80 backdrop-blur-2xl border border-white/10 rounded-[32px] p-10 shadow-2xl overflow-hidden group">
          <div className="flex flex-col items-center mb-10">
            <div style={{ perspective: '600px' }} className="mb-4">
              <motion.div
                animate={{ rotateY: [0, 360] }}
                transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                style={{ transformStyle: 'preserve-3d' }}
                className="w-24 h-24 flex items-center justify-center"
              >
                <img src="/doorman-logo.png?v=3" alt="Doorman Logo" className="w-full h-full object-contain drop-shadow-[0_0_18px_rgba(232,222,140,0.5)]" />
              </motion.div>
            </div>
            <h1
              style={{ fontFamily: "Georgia, 'Times New Roman', serif", color: '#e8de8c', letterSpacing: '0.02em' }}
              className="text-5xl font-bold italic"
            >
              DoorMan
            </h1>
            <p
              style={{ fontFamily: "Georgia, 'Times New Roman', serif", color: '#e8de8c' }}
              className="text-sm italic opacity-70 mt-1 tracking-wide"
            >
              Входные металлические двери
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Имя пользователя</label>
              <div className="relative group/input">
                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within/input:text-blue-500 transition-colors" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all font-medium text-white placeholder-gray-600"
                  placeholder="Введите имя..."
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Пароль</label>
              <div className="relative group/input">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within/input:text-blue-500 transition-colors" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all font-medium text-white placeholder-gray-600"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-red-400 text-sm font-medium bg-red-400/10 p-3 rounded-xl border border-red-400/20 flex items-center gap-2"
              >
                <Lock size={14} /> {error}
              </motion.p>
            )}

            <button
              disabled={isLoading}
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl transition-all duration-300 shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2 group/btn disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Вход в систему
                  <ChevronRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <InstallPWA />

          <div className="mt-8 pt-8 border-t border-white/5 text-center">
            <p className="text-[10px] text-gray-600 uppercase tracking-widest font-bold">система учёта торговли</p>
          </div>
        </div>

        {/* Floating Decorative Elements */}
        <motion.div
          animate={{
            y: [0, -20, 0],
            rotate: [0, 5, 0]
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-12 -right-12 w-24 h-24 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl backdrop-blur-3xl border border-white/10 -z-10"
        />
        <motion.div
          animate={{
            y: [0, 20, 0],
            rotate: [0, -5, 0]
          }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -bottom-8 -left-8 w-20 h-20 bg-gradient-to-br from-indigo-500/20 to-blue-500/20 rounded-2xl backdrop-blur-3xl border border-white/10 -z-10"
        />
      </motion.div>
    </div>
  );
};

export default Login;
