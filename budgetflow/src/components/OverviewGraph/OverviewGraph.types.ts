import type { RegistryRow } from '../RegistryTable/RegistryTable.types';
import type { SavingItem } from '../../pages/Savings/Savings.type';

export type OverviewGraphProps = {
  earningsRows: RegistryRow[];
  expensesRows: RegistryRow[];
  savingsItems: SavingItem[];
};