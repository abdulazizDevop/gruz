import React, { useState } from 'react'
import { RefreshCw, AlertTriangle } from 'lucide-react'
import { hardReset } from '../lib/version'

// Full-screen non-dismissable overlay shown when the server reports a
// newer bundle than the one currently running. The user has one option:
// press "Обновить" which unregisters SWs, drops every cache, and reloads
// with a cache-busting query so bfcache on iOS can't just resume the old
// tab.
const UpdateBlocker = ({ serverVersion, currentVersion }) => {
  const [reloading, setReloading] = useState(false)

  const onReload = async () => {
    setReloading(true)
    try {
      await hardReset()
    } catch {
      // hardReset already swallows per-step errors and reloads. Fallback
      // just in case it throws before the reload.
      window.location.reload()
    }
  }

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 backdrop-blur-md p-6"
      role="alertdialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md bg-[#111114] border border-[#e8de8c]/30 rounded-3xl p-8 shadow-2xl text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-[#e8de8c]/10 flex items-center justify-center mb-5">
          <AlertTriangle size={32} className="text-[#e8de8c]" />
        </div>
        <h2 className="text-xl font-bold mb-2 text-white">
          Доступна новая версия
        </h2>
        <p className="text-sm text-gray-400 leading-relaxed mb-6">
          Для продолжения работы обновите приложение. Старая версия может
          работать некорректно — пожалуйста, нажмите «Обновить», чтобы
          загрузить последнюю версию.
        </p>
        <button
          onClick={onReload}
          disabled={reloading}
          className="w-full flex items-center justify-center gap-2 bg-[#e8de8c] hover:bg-[#d4cb7a] disabled:opacity-70 text-black font-bold py-3.5 rounded-2xl transition-colors"
        >
          <RefreshCw
            size={18}
            className={reloading ? 'animate-spin' : ''}
          />
          {reloading ? 'Обновляем...' : 'Обновить'}
        </button>
        {(serverVersion || currentVersion) && (
          <p className="text-[10px] text-gray-600 mt-4 font-mono">
            {currentVersion && <>текущая: {currentVersion}</>}
            {currentVersion && serverVersion && <> · </>}
            {serverVersion && <>новая: {serverVersion}</>}
          </p>
        )}
      </div>
    </div>
  )
}

export default UpdateBlocker
