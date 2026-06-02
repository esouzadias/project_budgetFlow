// src/storage/budgetStorage.ts
import type { RegistryRow } from "../components/RegistryTable/RegistryTable.types";
import type { SavingItem } from "../pages/Savings/Savings.type";

export type PeriodKey = `${number}-${string}`; // "YYYY-MM"

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

const safeParse = <T>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
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

  const keys = (Object.keys(map) as PeriodKey[]).filter((k) => k.startsWith(prefix));
  if (!keys.length) return;

  const payload: Record<PeriodKey, PeriodData> = {};
  for (const k of keys) payload[k] = map[k];

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

  for (const k of keys) delete map[k];
  writeDataMap(map);
};

export const purgeExpiredBackups = () => {
  const backups = readBackups();
  const t = now();
  const next = backups.filter((b) => b.expiresAt > t);
  if (next.length !== backups.length) writeBackups(next);
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

  const a = document.createElement("a");
  a.href = url;
  a.download = `budgetflow-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();

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