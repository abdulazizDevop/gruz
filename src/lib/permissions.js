export const SECTIONS = [
  { key: 'dashboard', label: 'Главная' },
  { key: 'orders', label: 'Заказы' },
  { key: 'wholesalers', label: 'Оптовики' },
  { key: 'warehouse', label: 'Склад' },
  { key: 'reserved', label: 'Заказной склад' },
  { key: 'archive', label: 'Архив' },
];

export const FEATURE_FLAGS = [
  { key: 'client_info', label: 'Видеть данные клиента (имя, адрес, цена)' },
  { key: 'set_urgent', label: 'Ставить статус «Срочное»' },
  { key: 'manage_wholesalers', label: 'Добавлять и изменять оптовиков' },
  { key: 'create_order', label: 'Создавать заказы' },
];

const ALL_KEYS = [...SECTIONS.map(s => s.key), ...FEATURE_FLAGS.map(f => f.key)];

const SYSTEM_DEFAULTS = {
  superadmin: ALL_KEYS,
  admin: ['dashboard', 'orders', 'wholesalers', 'reserved', 'archive', 'client_info', 'set_urgent', 'manage_wholesalers', 'create_order'],
  warehouse: ['dashboard', 'warehouse', 'reserved'],
};

const PRODUCTION_DEFAULTS = ['dashboard', 'orders', 'reserved'];

export const getDefaultPermissions = (role) => {
  if (SYSTEM_DEFAULTS[role]) return [...SYSTEM_DEFAULTS[role]];
  return [...PRODUCTION_DEFAULTS];
};

export const getPermissions = (user) => {
  if (!user) return [];
  if (user.role === 'superadmin') return [...ALL_KEYS, 'admins'];
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
