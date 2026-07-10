import type { IconId } from "../../components/IconSelectorMenu/IconSelectorMenu.types";
import type { RegistryRow } from "../../components/RegistryTable/RegistryTable.types";
import type { SavingItem } from "../Savings/Savings.type";

export type MonthKey = `${number}-${"01" | "02" | "03" | "04" | "05" | "06" | "07" | "08" | "09" | "10" | "11" | "12"}`;

export type BudgetTableType = "income" | "expense" | "saving" | "debt" | "custom";

export type BudgetTable = {
  id: string;
  name: string;
  type: BudgetTableType;
  visible: boolean;
  rows: RegistryRow[];
};

export type FormulaAccent = "green" | "red" | "blue" | "purple" | "orange";

export type CustomFormulaPanel = {
  id: string;
  title: string;
  expression: string;
  accent: FormulaAccent;
  iconId: IconId;
  iconImageUrl?: string | null;
  color: string;
};

export type DashboardChartType = "bar" | "line" | "pie";

export type DashboardChart = {
  id: string;
  title: string;
  type: DashboardChartType;
  sourceTableIds: string[];
  visible: boolean;
};

export type MonthSnapshot = {
  tables: BudgetTable[];
  customFormulaPanels: CustomFormulaPanel[];
  charts: DashboardChart[];
  savings: SavingItem[];
};

export type DashboardStore = {
  version: number;
  updatedAt: string;
  currency: string;
  activePeriodKey: MonthKey;
  periods: Record<MonthKey, MonthSnapshot>;
};

export type DashboardYearStore = Record<MonthKey, MonthSnapshot>;