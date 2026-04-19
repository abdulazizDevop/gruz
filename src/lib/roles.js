export const ROLES = [
  { key: 'admin', label: 'Админ' },
  { key: 'designer', label: 'Проектировщик' },
  { key: 'laser_operator', label: 'Оператор лазера' },
  { key: 'bender_operator', label: 'Оператор листогиба' },
  { key: 'welder', label: 'Сварщик' },
  { key: 'painter', label: 'Маляр' },
  { key: 'assembler', label: 'Сборщик' },
  { key: 'warehouse', label: 'Склад' },
];

export const PRODUCTION_ROLES = [
  'designer',
  'laser_operator',
  'bender_operator',
  'welder',
  'painter',
  'assembler',
];

export const isProductionRole = (role) => PRODUCTION_ROLES.includes(role);
export const isAdminRole = (role) => role === 'admin' || role === 'superadmin';

export const getRoleLabel = (role) => {
  if (role === 'superadmin') return 'Главный';
  const found = ROLES.find((r) => r.key === role);
  return found ? found.label : 'Сотрудник';
};
