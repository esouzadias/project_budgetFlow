import type { IconId } from '../IconSelectorMenu/IconSelectorMenu.types';

export type CurrencyOption = {
  code: 'EUR' | 'USD' | 'GBP' | 'BRL';
  label: string;
};

export type DecimalSeparator = '.' | ',';

export type ToastState = {
  open: boolean;
  message: string;
  severity: 'success' | 'info' | 'warning' | 'error';
};

export type TotalStep = {
  id: string;
  label: string;
  value: number;
  running: number;
};

export type Category = {
  id: string;
  name: string;
  color: string;
};

export type RegistryRow = {
  id: string;
  label: string;
  amount: number | null;
  prevAmount: number | null;
  note: string;

  iconId: IconId;
  color: string;

  categories: string[];
  recurring: boolean;
};