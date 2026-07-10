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
  iconImageUrl: string | null;
  color: string;
  goalAmount: number | null;
  recurring: boolean;
  transactions: SavingsTransaction[];
};