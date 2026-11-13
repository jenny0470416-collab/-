import { ConverterCategory, ConverterCategoryId } from '../types/calculator';

export const CONVERTER_CATEGORIES: ConverterCategory[] = [
  {
    id: 'area',
    label: '넓이',
    units: [
      { id: 'sqm', label: '제곱미터', symbol: '㎡', factor: 1 },
      { id: 'pyeong', label: '평', symbol: '평', factor: 3.305785124 },
      { id: 'sqcm', label: '제곱센티미터', symbol: '㎠', factor: 0.0001 },
      { id: 'sqkm', label: '제곱킬로미터', symbol: '㎢', factor: 1_000_000 },
      { id: 'ha', label: '헥타르', symbol: 'ha', factor: 10_000 },
      { id: 'sqft', label: '제곱피트', symbol: 'ft²', factor: 0.09290304 },
      { id: 'acre', label: '에이커', symbol: 'ac', factor: 4046.8564224 },
    ],
  },
  {
    id: 'length',
    label: '길이',
    units: [
      { id: 'm', label: '미터', symbol: 'm', factor: 1 },
      { id: 'cm', label: '센티미터', symbol: 'cm', factor: 0.01 },
      { id: 'mm', label: '밀리미터', symbol: 'mm', factor: 0.001 },
      { id: 'km', label: '킬로미터', symbol: 'km', factor: 1000 },
      { id: 'inch', label: '인치', symbol: 'in', factor: 0.0254 },
      { id: 'ft', label: '피트', symbol: 'ft', factor: 0.3048 },
      { id: 'yd', label: '야드', symbol: 'yd', factor: 0.9144 },
      { id: 'mi', label: '마일', symbol: 'mi', factor: 1609.344 },
    ],
  },
  {
    id: 'weight',
    label: '무게',
    units: [
      { id: 'kg', label: '킬로그램', symbol: 'kg', factor: 1 },
      { id: 'g', label: '그램', symbol: 'g', factor: 0.001 },
      { id: 'mg', label: '밀리그램', symbol: 'mg', factor: 0.000001 },
      { id: 'ton', label: '톤', symbol: 't', factor: 1000 },
      { id: 'geun', label: '근 (600g)', symbol: '근', factor: 0.6 },
      { id: 'lb', label: '파운드', symbol: 'lb', factor: 0.45359237 },
      { id: 'oz', label: '온스', symbol: 'oz', factor: 0.0283495231 },
    ],
  },
  {
    id: 'temperature',
    label: '온도',
    units: [
      { id: 'c', label: '섭씨', symbol: '°C' },
      { id: 'f', label: '화씨', symbol: '°F' },
      { id: 'k', label: '켈빈', symbol: 'K' },
    ],
  },
  {
    id: 'data',
    label: '데이터',
    units: [
      { id: 'mb', label: '메가바이트', symbol: 'MB', factor: 1024 * 1024 },
      { id: 'b', label: '바이트', symbol: 'B', factor: 1 },
      { id: 'kb', label: '킬로바이트', symbol: 'KB', factor: 1024 },
      { id: 'gb', label: '기가바이트', symbol: 'GB', factor: 1024 ** 3 },
      { id: 'tb', label: '테라바이트', symbol: 'TB', factor: 1024 ** 4 },
    ],
  },
];

export function convertUnitValue(
  value: number,
  categoryId: ConverterCategoryId,
  fromUnitId: string,
  toUnitId: string
): number {
  if (!Number.isFinite(value)) return NaN;
  if (fromUnitId === toUnitId) return value;

  if (categoryId === 'temperature') {
    let celsius = value;
    if (fromUnitId === 'f') celsius = (value - 32) * (5 / 9);
    else if (fromUnitId === 'k') celsius = value - 273.15;

    if (toUnitId === 'c') return celsius;
    if (toUnitId === 'f') return celsius * (9 / 5) + 32;
    if (toUnitId === 'k') return celsius + 273.15;
    return value;
  }

  const category = CONVERTER_CATEGORIES.find((c) => c.id === categoryId);
  if (!category) return NaN;
  const fromUnit = category.units.find((u) => u.id === fromUnitId);
  const toUnit = category.units.find((u) => u.id === toUnitId);
  if (!fromUnit?.factor || !toUnit?.factor) return NaN;

  const baseValue = value * fromUnit.factor;
  return baseValue / toUnit.factor;
}
