export const SYSTEM_ROLES = [
  { key: 'admin', label: 'Админ' },
  { key: 'warehouse', label: 'Склад' },
];

export const DEFAULT_DYNAMIC_LABELS = [
  'Проектировщик',
  'Оператор лазера',
  'Оператор листогиба',
  'Сварщик',
  'Маляр',
  'Сборщик',
];

const NON_PRODUCTION_KEYS = new Set(['admin', 'superadmin', 'warehouse']);

export const isProductionRole = (roleKey) => !!roleKey && !NON_PRODUCTION_KEYS.has(roleKey);

export const isAdminRole = (roleKey) => roleKey === 'admin' || roleKey === 'superadmin';

export const getRoleLabel = (roleKey, dynamicRoles = []) => {
  if (!roleKey) return 'Сотрудник';
  if (roleKey === 'superadmin') return 'Главный';
  const inSystem = SYSTEM_ROLES.find((r) => r.key === roleKey);
  if (inSystem) return inSystem.label;
  const inDynamic = dynamicRoles.find((r) => r.key === roleKey);
  if (inDynamic) return inDynamic.label;
  return roleKey;
};

export const getAllRoles = (dynamicRoles = []) => {
  const dynamic = dynamicRoles
    .map((r) => ({ key: r.key, label: r.label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'ru'));
  return [SYSTEM_ROLES[0], ...dynamic, SYSTEM_ROLES[1]];
};
