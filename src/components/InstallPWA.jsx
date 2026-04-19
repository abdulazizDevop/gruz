import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Share, Plus, X, Smartphone, CheckCircle2 } from 'lucide-react';

const detectIOS = () => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const isIPad = /iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const isIPhone = /iPhone|iPod/.test(ua);
  return (isIPad || isIPhone) && !/MSStream/.test(ua);
};

const detectSafari = () => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPT|OPiOS/.test(ua);
};

const isStandalone = () => {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
};

const InstallPWA = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(isStandalone());
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [ios] = useState(detectIOS());
  const [safari] = useState(detectSafari());

  useEffect(() => {
    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed) return null;

  const handleAndroidInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    setDeferredPrompt(null);
  };

  const canShow = ios || deferredPrompt;
  if (!canShow) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => (ios ? setShowIOSGuide(true) : handleAndroidInstall())}
        className="w-full mt-4 flex items-center justify-center gap-2 bg-white/[0.04] hover:bg-[#e8de8c]/10 border border-white/10 hover:border-[#e8de8c]/30 text-gray-300 hover:text-[#e8de8c] font-medium py-3 rounded-2xl transition-colors text-sm"
      >
        <Download size={16} />
        Установить приложение
      </button>

      <AnimatePresence>
        {showIOSGuide && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowIOSGuide(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative z-10 w-full max-w-md bg-[#111114] border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#e8de8c]/10 rounded-xl flex items-center justify-center text-[#e8de8c]">
                    <Smartphone size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold">Установка на iPhone</h3>
                    <p className="text-xs text-gray-500">3 простых шага</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1.5 hover:bg-white/5 rounded-lg text-gray-500"
                >
                  <X size={18} />
                </button>
              </div>

              {!safari && (
                <div className="mx-6 mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2">
                  <div className="text-amber-400 text-lg leading-none">⚠️</div>
                  <p className="text-xs text-amber-300 leading-snug">
                    Откройте эту страницу в <b>Safari</b> — установка работает только там.
                    Скопируйте адрес и откройте в Safari.
                  </p>
                </div>
              )}

              <div className="p-6 space-y-4">
                <Step
                  num={1}
                  title="Нажмите «Поделиться»"
                  description="Найдите внизу экрана кнопку с квадратом и стрелкой вверх."
                  icon={<Share size={18} />}
                />
                <Step
                  num={2}
                  title="«На экран Домой»"
                  description="Прокрутите вниз в открывшемся меню и нажмите «Add to Home Screen»."
                  icon={<Plus size={18} />}
                />
                <Step
                  num={3}
                  title="Готово — откройте с иконки"
                  description="Приложение появится на главном экране. Открывайте его именно оттуда — push-уведомления работают только так."
                  icon={<CheckCircle2 size={18} />}
                />
              </div>

              <div className="p-6 border-t border-white/[0.06] bg-white/[0.02]">
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="w-full bg-[#e8de8c] hover:bg-[#d4cb7a] text-black font-semibold py-3 rounded-xl transition-colors text-sm"
                >
                  Понятно
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

const Step = ({ num, title, description, icon }) => (
  <div className="flex items-start gap-3">
    <div className="w-8 h-8 rounded-full bg-[#e8de8c]/10 border border-[#e8de8c]/20 flex items-center justify-center text-[#e8de8c] shrink-0 font-bold text-sm">
      {num}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <h4 className="font-semibold text-sm">{title}</h4>
        <div className="text-gray-500">{icon}</div>
      </div>
      <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{description}</p>
    </div>
  </div>
);

export default InstallPWA;
