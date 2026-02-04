// src/pages/Savings/Savings.types.ts
import type { IconId } from '../../components/IconSelectorMenu/IconSelectorMenu.types';

export type SavingsTransaction = {
  id: string;
  amount: number;
  note: string;
  createdAt: number;
};

export type SavingItem = {
  id: string;
  name: string;
  iconId: IconId;
  color: string;
  goalAmount: number | null;
  transactions: SavingsTransaction[];
};