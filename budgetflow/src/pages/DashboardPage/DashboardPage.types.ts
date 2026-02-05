import type { RegistryRow } from '../../components/RegistryTable/RegistryTable.types';
import type { SavingItem } from '../Savings/Savings.type';

export type MonthKey = `${number}-${'01'|'02'|'03'|'04'|'05'|'06'|'07'|'08'|'09'|'10'|'11'|'12'}`;

export type MonthSnapshot = {
  earnings: RegistryRow[];
  expenses: RegistryRow[];
  savings: SavingItem[];
};

export type DashboardYearStore = Record<MonthKey, MonthSnapshot>;