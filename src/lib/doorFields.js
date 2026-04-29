export const CANVAS_OPTIONS = [
  { value: 'Одностворчатый', label: 'Одностворчатый' },
  { value: 'Двустворчатый', label: 'Двустворчатый' },
];

export const OPENING_OPTIONS = [
  { value: 'Левое', label: 'Левое' },
  { value: 'Правое', label: 'Правое' },
];

export const DOOR_FIELDS = [
  { key: 'model', label: 'Модель' },
  { key: 'size', label: 'Размер' },
  { key: 'canvas', label: 'Полотно' },
  { key: 'opening', label: 'Открывание' },
  { key: 'color', label: 'Цвет' },
  { key: 'casing', label: 'Наличник' },
  { key: 'glass', label: 'Стекло' },
  { key: 'grille', label: 'Решетка' },
  { key: 'hardware', label: 'Фурнитура' },
  { key: 'threshold', label: 'Порог нержавейка' },
  { key: 'crown', label: 'Корона' },
  { key: 'panelOuter', label: 'Панель наружная' },
  { key: 'panelInner', label: 'Панель внутренняя' },
  { key: 'transom', label: 'Фрамуга' },
];

export const EMPTY_DOOR_SPECS = DOOR_FIELDS.reduce((acc, f) => {
  acc[f.key] = '';
  return acc;
}, {});

export const deriveCategoryFromCanvas = (canvas, fallback = 'single') => {
  if (canvas === 'Двустворчатый') return 'double';
  if (canvas === 'Одностворчатый') return 'single';
  return fallback;
};
