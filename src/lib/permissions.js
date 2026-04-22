export const SECTIONS = [
  { key: 'dashboard', label: 'Главная' },
  { key: 'orders', label: 'Заказы' },
  { key: 'wholesalers', label: 'Оптовики' },
  { key: 'warehouse', label: 'Склад' },
  { key: 'reserved', label: 'Заказной склад' },
  { key: 'archive', label: 'Архив' },
];

const DEFAULTS = {
  superadmin: ['dashboard', 'orders', 'wholesalers', 'warehouse', 'reserved', 'archive'],
  admin: ['dashboard', 'orders', 'wholesalers', 'reserved', 'archive'],
  warehouse: ['dashboard', 'warehouse', 'reserved'],
  designer: ['dashboard', 'orders', 'reserved'],
  laser_operator: ['dashboard', 'orders', 'reserved'],
  bender_operator: ['dashboard', 'orders', 'reserved'],
  welder: ['dashboard', 'orders', 'reserved'],
  painter: ['dashboard', 'orders', 'reserved'],
  assembler: ['dashboard', 'orders', 'reserved'],
};

export const getDefaultPermissions = (role) => DEFAULTS[role] ? [...DEFAULTS[role]] : ['dashboard'];

export const getPermissions = (user) => {
  if (!user) return [];
  if (user.role === 'superadmin') {
    return ['dashboard', 'orders', 'wholesalers', 'warehouse', 'reserved', 'archive', 'admins'];
  }
  if (Array.isArray(user.permissions) && user.permissions.length > 0) {
    return user.permissions;
  }
  return getDefaultPermissions(user.role);
};

export const hasPermission = (user, key) => {
  if (!user) return false;
  if (key === 'admins') return user.role === 'superadmin';
  return getPermissions(user).includes(key);
};

const ROUTE_ORDER = [
  { permission: 'dashboard', path: '/' },
  { permission: 'orders', path: '/orders' },
  { permission: 'reserved', path: '/reserved' },
  { permission: 'warehouse', path: '/warehouse' },
  { permission: 'wholesalers', path: '/wholesalers' },
  { permission: 'archive', path: '/archive' },
];

export const firstAllowedPath = (user) => {
  if (!user) return '/login';
  for (const r of ROUTE_ORDER) {
    if (hasPermission(user, r.permission)) return r.path;
  }
  if (user.role === 'superadmin') return '/admins';
  return '/login';
};
