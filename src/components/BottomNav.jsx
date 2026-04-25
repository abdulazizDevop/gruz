import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, PackageCheck, Warehouse, Archive, Menu, Users
} from 'lucide-react';
import { hasPermission } from '../lib/permissions';

const ALL_ITEMS = [
  { key: 'dashboard', to: '/', label: 'Главная', icon: LayoutDashboard },
  { key: 'orders', to: '/orders', label: 'Заказы', icon: ShoppingCart },
  { key: 'reserved', to: '/reserved', label: 'Готовые', icon: PackageCheck },
  { key: 'warehouse', to: '/warehouse', label: 'Склад', icon: Warehouse },
  { key: 'wholesalers', to: '/wholesalers', label: 'Оптовики', icon: Users },
  { key: 'archive', to: '/archive', label: 'Архив', icon: Archive },
];

const BottomNav = ({ user, onMore }) => {
  const location = useLocation();
  const available = ALL_ITEMS.filter(item => hasPermission(user, item.key));
  const items = available.slice(0, 4);

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0f0f12]/95 backdrop-blur-xl border-t border-white/[0.06]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-stretch justify-around px-1 py-1.5">
        {items.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.to;
          return (
            <Link
              key={item.key}
              to={item.to}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 px-1 py-1.5 rounded-xl transition-colors min-h-[52px] ${
                active ? 'text-[#e8de8c]' : 'text-gray-500 active:bg-white/5'
              }`}
              style={{ touchAction: 'manipulation' }}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 2} />
              <span className="text-[10px] font-semibold leading-none">{item.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={onMore}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 px-1 py-1.5 rounded-xl text-gray-500 active:bg-white/5 transition-colors min-h-[52px]"
          style={{ touchAction: 'manipulation' }}
          aria-label="Меню и выход"
        >
          <Menu size={22} />
          <span className="text-[10px] font-semibold leading-none">Меню</span>
        </button>
      </div>
    </nav>
  );
};

export default BottomNav;
