import type { RegistryRow } from "../components/RegistryTable/RegistryTable.types";
import type {
  BudgetTable,
  CustomFormulaPanel,
  DashboardStore,
  MonthKey,
  MonthSnapshot,
} from "../pages/DashboardPage/DashboardPage.types";
import type { SavingItem } from "../pages/Savings/Savings.type";
import LocalBudgetDB from "./LocalBudgetDB.json";

const LOCAL_BUDGET_DB_KEY = "budgetflow:local-budget-db";

export type PeriodKey = `${number}-${string}`;

export type PeriodData = {
  periodKey: PeriodKey;
  createdAt: number;
  updatedAt: number;

  earningsRows: RegistryRow[];
  expensesRows: RegistryRow[];
  savingsItems: SavingItem[];

  blockOrder: string[];
  visibilityById: Record<string, boolean>;
};

export type BackupEntry = {
  id: string;
  kind: "month" | "year";
  reason: string;

  deletedAt: number;
  expiresAt: number;

  periodKey?: PeriodKey;
  year?: number;

  payload: PeriodData | Record<PeriodKey, PeriodData>;
};

const DATA_KEY = "bf:data:v1";
const BACKUP_KEY = "bf:backups:v1";

const MS_DAY = 24 * 60 * 60 * 1000;
const BACKUP_RETENTION_DAYS = 30;

const now = () => Date.now();

const safeParse = <T,>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const createMonthKey = (date = new Date()): MonthKey => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}` as MonthKey;
};

const createDefaultFormulaPanels = (): CustomFormulaPanel[] => [
  {
    id: crypto.randomUUID(),
    title: "Total Income",
    expression: "total_income",
    accent: "green",
    iconId: "paid",
    iconImageUrl: null,
    color: "#34a853",
  },
  {
    id: crypto.randomUUID(),
    title: "Total Expenses",
    expression: "total_expenses",
    accent: "red",
    iconId: "receipt",
    iconImageUrl: null,
    color: "#ea4335",
  },
  {
    id: crypto.randomUUID(),
    title: "Balance",
    expression: "total_income - total_expenses",
    accent: "blue",
    iconId: "bank",
    iconImageUrl: null,
    color: "#1a73e8",
  },
];

const normalizeFormulaAccent = (accent: any): CustomFormulaPanel["accent"] => {
  if (accent === "green" || accent === "red" || accent === "blue" || accent === "purple" || accent === "orange") {
    return accent;
  }

  return "blue";
};

const normalizeIconImageUrl = (value: any) => {
  if (typeof value !== "string") return null;

  const cleanValue = value.trim();
  if (!cleanValue) return null;

  if (!cleanValue.startsWith("data:image/")) return cleanValue;

  return cleanValue.length <= 12000 ? cleanValue : null;
};

const normalizeRow = (row: any): RegistryRow => ({
  id: row.id ?? crypto.randomUUID(),
  label: row.label ?? "",
  amount: typeof row.amount === "number" ? row.amount : null,
  prevAmount: typeof row.prevAmount === "number" ? row.prevAmount : null,
  note: row.note ?? "",
  iconId: row.iconId ?? "other",
  iconImageUrl: normalizeIconImageUrl(row.iconImageUrl),
  color: row.color ?? "#1a73e8",
  categories: Array.isArray(row.categories) ? row.categories : [],
  recurring: Boolean(row.recurring),
});

const normalizeTable = (table: any, fallbackIndex: number): BudgetTable => ({
  id: table.id ?? `table-${fallbackIndex}-${crypto.randomUUID()}`,
  name: table.name ?? "Custom Table",
  type: table.type ?? "custom",
  visible: table.visible !== false,
  rows: Array.isArray(table.rows) ? table.rows.map(normalizeRow) : [],
});

const normalizeFormulaPanel = (panel: any): CustomFormulaPanel => ({
  id: panel.id ?? crypto.randomUUID(),
  title: panel.title ?? "Formula",
  expression: panel.expression ?? "0",
  accent: normalizeFormulaAccent(panel.accent),
  iconId: panel.iconId ?? "other",
  iconImageUrl: normalizeIconImageUrl(panel.iconImageUrl),
  color: panel.color ?? "#1a73e8",
});

const createDefaultPeriodFromLegacyData = (data: any): MonthSnapshot => ({
  tables: [
    {
      id: "table-income",
      name: "Income",
      type: "income",
      visible: true,
      rows: Array.isArray(data.incomeRows) ? data.incomeRows.map(normalizeRow) : [],
    },
    {
      id: "table-expenses",
      name: "Expenses",
      type: "expense",
      visible: true,
      rows: Array.isArray(data.expenseRows) ? data.expenseRows.map(normalizeRow) : [],
    },
  ],
  customFormulaPanels:
    Array.isArray(data.customFormulaPanels) && data.customFormulaPanels.length > 0
      ? data.customFormulaPanels.map(normalizeFormulaPanel)
      : createDefaultFormulaPanels(),
  charts: [],
});

const normalizePeriod = (period: any, fallbackData: any): MonthSnapshot => {
  if (!period) return createDefaultPeriodFromLegacyData(fallbackData);

  const fallbackPeriod = createDefaultPeriodFromLegacyData(fallbackData);

  return {
    tables: Array.isArray(period.tables)
      ? period.tables.map((table: any, index: number) => normalizeTable(table, index))
      : fallbackPeriod.tables,
    customFormulaPanels:
      Array.isArray(period.customFormulaPanels) && period.customFormulaPanels.length > 0
        ? period.customFormulaPanels.map(normalizeFormulaPanel)
        : fallbackPeriod.customFormulaPanels,
    charts: Array.isArray(period.charts) ? period.charts : [],
  };
};

const normalizeDashboardStore = (data: any): DashboardStore => {
  const fallbackPeriodKey = (data.activePeriodKey ?? createMonthKey()) as MonthKey;
  const fallbackPeriod = createDefaultPeriodFromLegacyData(data);
  const rawPeriods = data.periods && typeof data.periods === "object" ? data.periods : { [fallbackPeriodKey]: fallbackPeriod };

  const periods = Object.entries(rawPeriods).reduce((acc, [key, period]) => {
    acc[key as MonthKey] = normalizePeriod(period, data);
    return acc;
  }, {} as Record<MonthKey, MonthSnapshot>);

  if (!periods[fallbackPeriodKey]) {
    periods[fallbackPeriodKey] = fallbackPeriod;
  }

  return {
    version: data.version ?? 2,
    updatedAt: data.updatedAt ?? new Date().toISOString(),
    currency: data.currency ?? "EUR",
    activePeriodKey: fallbackPeriodKey,
    periods,
  };
};

export const loadLocalBudgetDB = (): DashboardStore => {
  const storedData = safeParse<any>(localStorage.getItem(LOCAL_BUDGET_DB_KEY), null);
  const data: any = storedData ?? LocalBudgetDB;

  return normalizeDashboardStore(data);
};

export const saveLocalBudgetDB = (data: Partial<DashboardStore>) => {
  const normalizedData = normalizeDashboardStore(data);
  const nextData: DashboardStore = {
    ...normalizedData,
    version: normalizedData.version ?? 2,
    updatedAt: new Date().toISOString(),
  };

  localStorage.setItem(LOCAL_BUDGET_DB_KEY, JSON.stringify(nextData));

  return nextData;
};

export const clearLocalBudgetDB = () => {
  localStorage.removeItem(LOCAL_BUDGET_DB_KEY);
};

const readDataMap = (): Record<PeriodKey, PeriodData> =>
  safeParse<Record<PeriodKey, PeriodData>>(localStorage.getItem(DATA_KEY), {});

const writeDataMap = (map: Record<PeriodKey, PeriodData>) =>
  localStorage.setItem(DATA_KEY, JSON.stringify(map));

const readBackups = (): BackupEntry[] =>
  safeParse<BackupEntry[]>(localStorage.getItem(BACKUP_KEY), []);

const writeBackups = (items: BackupEntry[]) =>
  localStorage.setItem(BACKUP_KEY, JSON.stringify(items));

export const getCurrentPeriodKey = (d = new Date()): PeriodKey => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}` as PeriodKey;
};

export const listPeriodKeys = (): PeriodKey[] => {
  const map = readDataMap();

  return (Object.keys(map) as PeriodKey[]).sort();
};

export const getPeriod = (periodKey: PeriodKey): PeriodData | null => {
  const map = readDataMap();

  return map[periodKey] ?? null;
};

export const upsertPeriod = (period: PeriodData) => {
  const map = readDataMap();

  map[period.periodKey] = period;
  writeDataMap(map);
};

export const ensurePeriod = (periodKey: PeriodKey): PeriodData => {
  const existing = getPeriod(periodKey);
  if (existing) return existing;

  const createdAt = now();
  const base: PeriodData = {
    periodKey,
    createdAt,
    updatedAt: createdAt,

    earningsRows: [],
    expensesRows: [],
    savingsItems: [],

    blockOrder: ["bar", "pie-earnings", "pie-expenses", "earnings", "expenses", "savings"],
    visibilityById: {},
  };

  upsertPeriod(base);

  return base;
};

export const ensureCurrentYearRecord = (): PeriodKey => {
  const key = getCurrentPeriodKey();

  ensurePeriod(key);

  return key;
};

export const deleteMonthToBackup = (periodKey: PeriodKey, reason: string) => {
  const map = readDataMap();
  const data = map[periodKey];

  if (!data) return;

  const deletedAt = now();
  const expiresAt = deletedAt + BACKUP_RETENTION_DAYS * MS_DAY;

  const entry: BackupEntry = {
    id: crypto.randomUUID(),
    kind: "month",
    reason,
    deletedAt,
    expiresAt,
    periodKey,
    payload: data,
  };

  const backups = readBackups();

  writeBackups([entry, ...backups]);

  delete map[periodKey];
  writeDataMap(map);
};

export const deleteYearToBackup = (year: number, reason: string) => {
  const map = readDataMap();
  const prefix = `${year}-`;

  const keys = (Object.keys(map) as PeriodKey[]).filter((key) => key.startsWith(prefix));

  if (!keys.length) return;

  const payload: Record<PeriodKey, PeriodData> = {};

  for (const key of keys) {
    payload[key] = map[key];
  }

  const deletedAt = now();
  const expiresAt = deletedAt + BACKUP_RETENTION_DAYS * MS_DAY;

  const entry: BackupEntry = {
    id: crypto.randomUUID(),
    kind: "year",
    reason,
    deletedAt,
    expiresAt,
    year,
    payload,
  };

  const backups = readBackups();

  writeBackups([entry, ...backups]);

  for (const key of keys) {
    delete map[key];
  }

  writeDataMap(map);
};

export const purgeExpiredBackups = () => {
  const backups = readBackups();
  const timestamp = now();
  const nextBackups = backups.filter((backup) => backup.expiresAt > timestamp);

  if (nextBackups.length !== backups.length) {
    writeBackups(nextBackups);
  }
};

export const exportAllToJsonFile = () => {
  const data = readDataMap();
  const backups = readBackups();

  const payload = {
    version: 1,
    exportedAt: now(),
    data,
    backups,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = url;
  link.download = `budgetflow-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();

  URL.revokeObjectURL(url);
};

export const importAllFromJsonFile = async (file: File) => {
  const text = await file.text();
  const parsed = JSON.parse(text) as {
    version?: number;
    data?: Record<PeriodKey, PeriodData>;
    backups?: BackupEntry[];
  };

  const data = parsed.data ?? {};
  const backups = parsed.backups ?? [];

  localStorage.setItem(DATA_KEY, JSON.stringify(data));
  localStorage.setItem(BACKUP_KEY, JSON.stringify(backups));

  purgeExpiredBackups();
};