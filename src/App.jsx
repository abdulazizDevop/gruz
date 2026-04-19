import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { OrderProvider, useOrders } from './context/OrderContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  ShoppingCart,
  Warehouse,
  Users,
  LogOut,
  Bell,
  Search,
  Package,
  AlertCircle,
  Menu,
  X,
  UserCheck,
  PackageCheck,
  ChevronLeft,
  Archive
} from 'lucide-react';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import WarehousePage from './pages/Warehouse';
import ReservedWarehouse from './pages/ReservedWarehouse';
import AdminManagement from './pages/AdminManagement';
import Wholesalers from './pages/Wholesalers';
import ArchivePage from './pages/Archive';
import BottomNav from './components/BottomNav';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { currentUser } = useAuth();
  if (!currentUser) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    return <Navigate to="/" replace />;
  }
  return children;
};

const SidebarItem = ({ to, icon: Icon, label, active, collapsed }) => (
  <Link to={to} className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-200 group relative ${
    active
      ? 'bg-[#e8de8c]/10 text-[#e8de8c]'
      : 'text-gray-500 hover:text-white hover:bg-white/5'
  } ${collapsed ? 'justify-center px-3' : ''}`}>
    <Icon size={20} strokeWidth={active ? 2.5 : 2} />
    {!collapsed && <span className="font-semibold text-sm">{label}</span>}
    {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#e8de8c] rounded-r-full" />}
  </Link>
);

const Layout = ({ children }) => {
  const { currentUser, logout } = useAuth();
  const { notifications, orders } = useOrders();
  const location = useLocation();
  const [isDesktopCollapsed, setIsDesktopCollapsed] = React.useState(false);
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);

  React.useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'superadmin';
  const isSuperAdmin = currentUser?.role === 'superadmin';
  const isWarehouse = currentUser?.role === 'warehouse';
  const isAssembler = currentUser?.role === 'assembler';

  const readyCount = orders.filter(o => o.status?.includes('✅')).length;
  const desktopWidth = isDesktopCollapsed ? 72 : 260;

  const SidebarContent = ({ collapsed }) => (
    <>
      <div className={`h-16 flex items-center border-b border-white/[0.06] ${collapsed ? 'justify-center px-2' : 'px-5 gap-3'}`}>
        <img src="/doorman-logo.png?v=3" alt="D" className="w-8 h-8 object-contain shrink-0" />
        {!collapsed && (
          <span
            style={{ fontFamily: 'Georgia, serif', color: '#e8de8c' }}
            className="text-lg font-bold italic tracking-wide"
          >DoorMan</span>
        )}
        {!collapsed && (
          <button
            onClick={() => setIsDesktopCollapsed(true)}
            className="ml-auto hidden md:flex p-1.5 hover:bg-white/5 rounded-lg text-gray-500 hover:text-gray-300 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
        )}
        <button
          onClick={() => setIsMobileOpen(false)}
          className="md:hidden ml-auto p-1.5 hover:bg-white/5 rounded-lg text-gray-500 hover:text-gray-300 transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {collapsed && (
        <button
          onClick={() => setIsDesktopCollapsed(false)}
          className="hidden md:flex items-center justify-center py-3 text-gray-500 hover:text-gray-300"
        >
          <Menu size={18} />
        </button>
      )}

      <nav className={`flex-1 ${collapsed ? 'px-2' : 'px-3'} py-4 space-y-1 overflow-y-auto`}>
        {!collapsed && <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest px-4 mb-2">Главное</p>}
        <SidebarItem to="/" icon={LayoutDashboard} label="Обзор" active={location.pathname === '/'} collapsed={collapsed} />

        {(isAdmin || isSuperAdmin || isAssembler) && (
          <>
            {!collapsed && <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest px-4 mt-5 mb-2">Торговля</p>}
            <SidebarItem to="/orders" icon={ShoppingCart} label="Заказы" active={location.pathname === '/orders'} collapsed={collapsed} />
            {(isAdmin || isSuperAdmin) && (
              <SidebarItem to="/wholesalers" icon={Users} label="Оптовики" active={location.pathname === '/wholesalers'} collapsed={collapsed} />
            )}
          </>
        )}

        {(isWarehouse || isSuperAdmin) && (
          <>
            {!collapsed && <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest px-4 mt-5 mb-2">Склад</p>}
            <SidebarItem to="/warehouse" icon={Warehouse} label="Склад" active={location.pathname === '/warehouse'} collapsed={collapsed} />
          </>
        )}

        <SidebarItem to="/reserved" icon={PackageCheck} label="Заказной склад" active={location.pathname === '/reserved'} collapsed={collapsed} />

        {(isAdmin || isSuperAdmin) && (
          <SidebarItem to="/archive" icon={Archive} label="Архив" active={location.pathname === '/archive'} collapsed={collapsed} />
        )}

        {isSuperAdmin && (
          <>
            {!collapsed && <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest px-4 mt-5 mb-2">Система</p>}
            <SidebarItem to="/admins" icon={UserCheck} label="Управление" active={location.pathname === '/admins'} collapsed={collapsed} />
          </>
        )}
      </nav>

      <div className="border-t border-white/[0.06] p-3">
        <div className={`flex items-center gap-3 p-2 rounded-xl ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-9 h-9 bg-[#e8de8c]/15 rounded-xl flex items-center justify-center text-[#e8de8c] text-sm font-bold shrink-0">
            {currentUser?.name?.[0]}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{currentUser?.name}</p>
              <p className="text-[10px] text-gray-500 capitalize">{currentUser?.role}</p>
            </div>
          )}
        </div>
        <button
          onClick={logout}
          className={`w-full mt-1 flex items-center gap-2 px-3 py-2.5 text-gray-500 hover:text-red-400 hover:bg-red-500/5 rounded-xl transition-colors text-sm ${collapsed ? 'justify-center' : ''}`}
        >
          <LogOut size={18} />
          {!collapsed && <span className="font-medium">Выйти</span>}
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#09090b] text-white flex">
      {/* Desktop sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: desktopWidth }}
        transition={{ duration: 0.2 }}
        className="hidden md:flex fixed top-0 left-0 h-screen bg-[#0f0f12] border-r border-white/[0.06] flex-col z-50"
      >
        <SidebarContent collapsed={isDesktopCollapsed} />
      </motion.aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileOpen(false)}
              className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="md:hidden fixed top-0 left-0 h-screen w-[260px] max-w-[85vw] bg-[#0f0f12] border-r border-white/[0.06] flex flex-col z-[51]"
            >
              <SidebarContent collapsed={false} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <main
        className="flex-1 flex flex-col h-screen overflow-hidden transition-all duration-200 ml-0 md:[margin-left:var(--sidebar-w)]"
        style={{ '--sidebar-w': `${desktopWidth}px` }}
      >
        {/* Top bar */}
        <header
          className="border-b border-white/[0.06] flex items-center justify-between gap-3 px-4 sm:px-6 bg-[#09090b]/90 backdrop-blur-xl sticky top-0 z-40"
          style={{ paddingTop: 'env(safe-area-inset-top)', minHeight: 'calc(4rem + env(safe-area-inset-top))' }}
        >
          <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
            <div className="relative w-full max-w-md hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
              <input
                type="text"
                placeholder="Поиск..."
                className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl py-2 pl-9 pr-4 focus:outline-none focus:border-[#e8de8c]/30 transition-colors text-sm text-gray-300 placeholder-gray-600"
              />
            </div>
            <span
              style={{ fontFamily: 'Georgia, serif', color: '#e8de8c' }}
              className="sm:hidden text-base font-bold italic tracking-wide"
            >DoorMan</span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {readyCount > 0 && (
              <Link
                to="/reserved"
                className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-xl hover:bg-amber-500/15 transition-colors"
              >
                <AlertCircle size={14} className="text-amber-500" />
                <span className="text-xs font-semibold text-amber-500">
                  <span className="hidden sm:inline">{readyCount} к отгрузке</span>
                  <span className="sm:hidden">{readyCount}</span>
                </span>
              </Link>
            )}

            <div className="relative">
              <button className="p-2 bg-white/[0.04] hover:bg-white/[0.08] rounded-xl transition-colors relative">
                <Bell size={18} className="text-gray-400" />
                {notifications.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#e8de8c] rounded-full" />
                )}
              </button>
            </div>

            <div className="hidden lg:flex items-center gap-2 pl-2 ml-1 border-l border-white/[0.06]">
              <div className="w-2 h-2 bg-emerald-500 rounded-full" />
              <span className="text-xs text-gray-500 font-medium">Онлайн</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <div
          className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24 md:pb-6"
          style={{ paddingBottom: 'max(6rem, calc(5rem + env(safe-area-inset-bottom)))' }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="max-w-7xl mx-auto"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <BottomNav role={currentUser?.role} onMore={() => setIsMobileOpen(true)} />

      {/* iPhone-style floating notifications */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {notifications.map(n => (
            <motion.div
              key={n.id}
              initial={{ y: -80, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -40, opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 22, stiffness: 320 }}
              className="pointer-events-auto bg-[#1c1c1e]/90 backdrop-blur-2xl border border-white/10 rounded-[22px] px-4 py-3 shadow-[0_20px_60px_rgba(0,0,0,0.6)] flex items-start gap-3 min-w-[320px] max-w-[380px]"
            >
              <div className="w-9 h-9 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-[10px] flex items-center justify-center shrink-0 shadow-lg">
                <Bell size={16} className="text-white" fill="white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-semibold text-[15px] text-white leading-tight">{n.title}</h4>
                  <span className="text-[10px] text-gray-400 font-medium shrink-0">сейчас</span>
                </div>
                <p className="text-[13px] text-gray-300 mt-0.5 leading-snug">{n.message}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <OrderProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={
              <ProtectedRoute>
                <Layout><Dashboard /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/orders" element={
              <ProtectedRoute allowedRoles={['admin', 'superadmin', 'assembler']}>
                <Layout><Orders /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/warehouse" element={
              <ProtectedRoute allowedRoles={['warehouse', 'superadmin']}>
                <Layout><WarehousePage /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/reserved" element={
              <ProtectedRoute>
                <Layout><ReservedWarehouse /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/admins" element={
              <ProtectedRoute allowedRoles={['superadmin']}>
                <Layout><AdminManagement /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/wholesalers" element={
              <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
                <Layout><Wholesalers /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/archive" element={
              <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
                <Layout><ArchivePage /></Layout>
              </ProtectedRoute>
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </OrderProvider>
    </AuthProvider>
  );
};

export default App;
