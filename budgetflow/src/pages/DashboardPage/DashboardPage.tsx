import "./DashboardPage.style.less";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent } from "react";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import SyncRoundedIcon from "@mui/icons-material/SyncRounded";
import Tooltip from "@mui/material/Tooltip";

import Navbar from "../../components/NavBar/Navbar";
import RegistryTable from "../../components/RegistryTable/RegistryTable";
import DashboardGrid, { type DashboardGridBlock, type DashboardGridLayoutItem } from "./components/DashboardGrid";
import CustomFormulaBox from "../../components/CustomFormulaBox/CustomFormulaBox";
import GenericPopup from "../../components/GenericPopup/GenericPopup";
import GenericOptionsPopup, { type GenericOptionsPopupOption } from "../../components/GenericOptionsPopup/GenericOptionsPopup";
import PeriodSelector from "../../components/PeriodSelector/PeriodSelector";
import TableSettingsPopup from "../../components/TableSettingsPopup/TableSettingsPopup";
import Savings from "../Savings/Savings";
import { loadLocalBudgetDB, saveLocalBudgetDB } from "../../storage/budgetStorage";
import { resolveTableFormulaData } from "../../utils/tableFormulaVariables";
import { getReadableTextColor } from "../../utils/colorContrast";
import { useLanguage } from "../../localization/useLanguage";

import type { LanguageDictionary } from "../../localization/languages";

import type { RegistryRow, RegistryTableSettings } from "../../components/RegistryTable/RegistryTable.types";
import type { SavingItem } from "../Savings/Savings.type";
import type {
  BudgetTable,
  BudgetTableType,
  CustomFormulaPanel,
  DashboardChart,
  DashboardStore,
  MonthKey,
  MonthSnapshot,
} from "./DashboardPage.types";

type UndoSnapshot = {
  activePeriodKey: MonthKey;
  periods: Record<MonthKey, MonthSnapshot>;
  currency: string;
};

const createId = () => crypto.randomUUID();

const createDefaultFormulaPanels = (): CustomFormulaPanel[] => [
  {
    id: createId(),
    title: "Total Income",
    expression: "total_income",
    accent: "green",
    iconId: "paid",
    iconImageUrl: null,
    color: "#34a853",
    backgroundColor: null,
  },
  {
    id: createId(),
    title: "Total Expenses",
    expression: "total_expenses",
    accent: "red",
    iconId: "receipt",
    iconImageUrl: null,
    color: "#ea4335",
    backgroundColor: null,
  },
  {
    id: createId(),
    title: "Balance",
    expression: "total_income - total_expenses",
    accent: "blue",
    iconId: "bank",
    iconImageUrl: null,
    color: "#1a73e8",
    backgroundColor: null,
  },
];

const createEmptyPeriod = (): MonthSnapshot => ({
  tables: [
    {
      id: "table-income",
      seriesId: "default-income",
      name: "Income",
      type: "income",
      visible: true,
      isDefault: true,
      accentColor: null,
      surfaceColorCustomized: false,
      rows: [],
    },
    {
      id: "table-expenses",
      seriesId: "default-expense",
      name: "Expenses",
      type: "expense",
      visible: true,
      isDefault: true,
      accentColor: null,
      surfaceColorCustomized: false,
      rows: [],
    },
  ],
  customFormulaPanels: createDefaultFormulaPanels(),
  charts: [],
  savings: [],
});

const getTableBaseName = (type: BudgetTableType, dictionary?: LanguageDictionary["dashboard"]) => {
  if (type === "income") return dictionary?.income ?? "Income";
  if (type === "expense") return dictionary?.expenses ?? "Expenses";
  if (type === "saving") return dictionary?.savings ?? "Savings";
  if (type === "debt") return dictionary?.debt ?? "Debt";

  return dictionary?.customTable ?? "Custom Table";
};

const getNextTableName = (tables: BudgetTable[], type: BudgetTableType, dictionary: LanguageDictionary["dashboard"]) => {
  const baseName = getTableBaseName(type, dictionary);
  const matchingCount = tables.filter((table) => table.type === type).length;

  if (matchingCount === 0) return baseName;

  return `${baseName} ${matchingCount + 1}`;
};

const getDashboardBlockSpan = (index: number, totalBlocks: number) => {
  const rowStartIndex = Math.floor(index / 3) * 3;
  const rowItemCount = Math.min(3, totalBlocks - rowStartIndex);

  if (rowItemCount === 1) return 12 as const;
  if (rowItemCount === 2) return 6 as const;

  return 4 as const;
};

const getMonthKeyFromDate = (date: Date): MonthKey => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}` as MonthKey;
};

const getCurrentMonthKey = (): MonthKey => getMonthKeyFromDate(new Date());

const shiftMonthKey = (monthKey: MonthKey, offset: number): MonthKey => {
  const [yearValue, monthValue] = monthKey.split("-").map(Number);
  const nextDate = new Date(yearValue, monthValue - 1 + offset, 1);

  return getMonthKeyFromDate(nextDate);
};

const getPreviousMonthKey = (monthKey: MonthKey): MonthKey => shiftMonthKey(monthKey, -1);

const getRowSeriesId = (row: RegistryRow) => row.seriesId ?? row.id;

const cloneRecurringRows = (rows: RegistryRow[]): RegistryRow[] => {
  return rows
    .filter((row) => row.recurring)
    .map((row) => ({
      ...row,
      id: createId(),
      seriesId: getRowSeriesId(row),
    }));
};

const normalizeTableSeriesName = (value: string) => {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const getTableSeriesId = (table: BudgetTable) => {
  if (table.seriesId) return table.seriesId;
  if (table.isDefault) return `default-${table.type}`;

  return `legacy-${table.type}-${normalizeTableSeriesName(table.name)}`;
};

const cloneRecurringTable = (table: BudgetTable): BudgetTable => ({
  ...table,
  id: createId(),
  seriesId: getTableSeriesId(table),
  isDefault: false,
  rows: cloneRecurringRows(table.rows),
});

const cloneDefaultTable = (
  type: Extract<BudgetTableType, "income" | "expense">,
  previousPeriod?: MonthSnapshot | null,
): BudgetTable => {
  const fallback = createEmptyPeriod().tables.find((table) => table.type === type)!;
  const source =
    previousPeriod?.tables.find((table) => table.isDefault && table.type === type) ??
    previousPeriod?.tables.find((table) => table.type === type && table.name === getTableBaseName(type)) ??
    fallback;

  return {
    ...source,
    id: createId(),
    seriesId: `default-${type}`,
    isDefault: true,
    rows: cloneRecurringRows(source.rows),
  };
};

const cloneFormulaPanels = (panels: CustomFormulaPanel[]): CustomFormulaPanel[] => {
  return panels.map((panel) => ({
    ...panel,
    id: createId(),
  }));
};

const cloneCharts = (charts: DashboardChart[]): DashboardChart[] => {
  return charts.map((chart) => ({
    ...chart,
    id: createId(),
    sourceTableIds: [...chart.sourceTableIds],
  }));
};

const cloneRecurringSavings = (items: SavingItem[]): SavingItem[] => {
  return items
    .filter((item) => item.recurring)
    .map((item) => ({
      ...item,
      id: createId(),
      transactions: [],
    }));
};

const createPeriodFromPreviousPeriod = (previousPeriod?: MonthSnapshot | null): MonthSnapshot => {
  const recurringTables = (previousPeriod?.tables ?? [])
    .filter((table) => !table.isDefault && table.rows.some((row) => row.recurring))
    .map(cloneRecurringTable);

  return {
    tables: [
      cloneDefaultTable("income", previousPeriod),
      cloneDefaultTable("expense", previousPeriod),
      ...recurringTables,
    ],
    customFormulaPanels:
      previousPeriod && previousPeriod.customFormulaPanels.length > 0
        ? cloneFormulaPanels(previousPeriod.customFormulaPanels)
        : createDefaultFormulaPanels(),
    charts: cloneCharts(previousPeriod?.charts ?? []),
    savings: cloneRecurringSavings(previousPeriod?.savings ?? []),
  };
};

const syncPeriodTablesFromPreviousPeriod = (
  period: MonthSnapshot,
  previousPeriod: MonthSnapshot,
): MonthSnapshot => {
  const previousAdditionalTables = previousPeriod.tables.filter((table) => !table.isDefault);
  const previousBySeries = new Map(previousAdditionalTables.map((table) => [getTableSeriesId(table), table]));
  let tablesChanged = false;

  const syncedTables = period.tables.flatMap((table) => {
    if (table.isDefault) return [table];

    const previousTable = previousBySeries.get(getTableSeriesId(table));
    if (!previousTable) return [table];

    const recurringRows = previousTable.rows.filter((row) => row.recurring);

    if (recurringRows.length === 0) {
      tablesChanged = true;
      return [];
    }

    const previousRowSeries = new Set(previousTable.rows.map(getRowSeriesId));
    const previousRowLabels = new Set(previousTable.rows.map((row) => normalizeTableSeriesName(row.label)));
    const usedRowIds = new Set<string>();

    const inheritedRows = recurringRows.map((sourceRow) => {
      const sourceSeriesId = getRowSeriesId(sourceRow);
      const existingRow =
        table.rows.find((row) => getRowSeriesId(row) === sourceSeriesId) ??
        table.rows.find(
          (row) =>
            !usedRowIds.has(row.id) &&
            normalizeTableSeriesName(row.label) === normalizeTableSeriesName(sourceRow.label),
        );

      if (!existingRow) return cloneRecurringRows([sourceRow])[0];

      usedRowIds.add(existingRow.id);
      return existingRow.seriesId === sourceSeriesId
        ? existingRow
        : { ...existingRow, seriesId: sourceSeriesId };
    });

    const localRows = table.rows.filter((row) => {
      if (usedRowIds.has(row.id)) return false;

      const rowSeriesId = getRowSeriesId(row);
      const rowLabel = normalizeTableSeriesName(row.label);

      return !previousRowSeries.has(rowSeriesId) && !previousRowLabels.has(rowLabel);
    });
    const nextRows = [...inheritedRows, ...localRows];

    if (
      nextRows.length === table.rows.length &&
      nextRows.every((row, index) => row === table.rows[index])
    ) {
      return [table];
    }

    tablesChanged = true;
    return [{ ...table, rows: nextRows }];
  });

  const existingSeries = new Set(syncedTables.filter((table) => !table.isDefault).map(getTableSeriesId));

  const missingRecurringTables = previousAdditionalTables
    .filter((table) => table.rows.some((row) => row.recurring) && !existingSeries.has(getTableSeriesId(table)))
    .map(cloneRecurringTable);

  const defaultTypes: Array<Extract<BudgetTableType, "income" | "expense">> = ["income", "expense"];
  const missingDefaultTables = defaultTypes
    .filter((type) => !syncedTables.some((table) => table.isDefault && table.type === type))
    .map((type) => cloneDefaultTable(type, previousPeriod));

  if (!tablesChanged && missingRecurringTables.length === 0 && missingDefaultTables.length === 0) {
    return period;
  }

  return {
    ...period,
    tables: [...missingDefaultTables, ...syncedTables, ...missingRecurringTables],
  };
};

const getMatchingPreviousTable = (previousTables: BudgetTable[], table: BudgetTable) => {
  return (
    previousTables.find((previousTable) => previousTable.type === table.type && previousTable.name === table.name) ??
    previousTables.find((previousTable) => previousTable.type === table.type) ??
    null
  );
};

const DashboardPage = () => {
  const { activeLanguage } = useLanguage();
  const dictionary = activeLanguage.dictionary;
  const [activePeriodKey, setActivePeriodKey] = useState<MonthKey>(getCurrentMonthKey());
  const [periods, setPeriods] = useState<Record<MonthKey, MonthSnapshot>>({});
  const [currency, setCurrency] = useState("EUR");
  const [tableIdPendingDelete, setTableIdPendingDelete] = useState<string | null>(null);
  const [tableOptionsAnchor, setTableOptionsAnchor] = useState<HTMLElement | null>(null);
  const [tableSettingsEditor, setTableSettingsEditor] = useState<{ anchorEl: HTMLElement; tableId: string } | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [hasLoadedBudgetDB, setHasLoadedBudgetDB] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [periodSelectorPinned, setPeriodSelectorPinned] = useState(false);

  const shouldSkipFirstSave = useRef(true);
  const hideSaveStatusTimeout = useRef<number | null>(null);
  const undoSnapshotRef = useRef<UndoSnapshot | null>(null);

  const activePeriod = periods[activePeriodKey] ?? createEmptyPeriod();
  const tables = activePeriod.tables;
  const customFormulaPanels = activePeriod.customFormulaPanels;
  const savings = activePeriod.savings ?? [];
  const previousPeriod = periods[getPreviousMonthKey(activePeriodKey)] ?? null;
  const tableCreationOptions = useMemo<GenericOptionsPopupOption[]>(
    () => [
      { id: "income", label: dictionary.dashboard.income, description: dictionary.dashboard.incomeOption },
      { id: "expense", label: dictionary.dashboard.expenses, description: dictionary.dashboard.expenseOption },
      { id: "custom", label: dictionary.dashboard.customTable, description: dictionary.dashboard.customOption },
    ],
    [dictionary],
  );

  const resolvedTableData = useMemo(() => resolveTableFormulaData(tables), [tables]);
  const resolvedPreviousTableData = useMemo(
    () => resolveTableFormulaData(previousPeriod?.tables ?? []),
    [previousPeriod],
  );
  const visibleTables = useMemo(
    () => resolvedTableData.tables.filter((table: BudgetTable) => table.visible),
    [resolvedTableData],
  );

  const tablePendingDelete = useMemo(
    () => tables.find((table: BudgetTable) => table.id === tableIdPendingDelete) ?? null,
    [tables, tableIdPendingDelete],
  );
  const tableBeingConfigured = useMemo(
    () => tables.find((table) => table.id === tableSettingsEditor?.tableId) ?? null,
    [tables, tableSettingsEditor],
  );

  const captureUndoSnapshot = useCallback(() => {
    undoSnapshotRef.current = {
      activePeriodKey,
      periods,
      currency,
    };

    setCanUndo(true);
  }, [activePeriodKey, periods, currency]);

  const clearUndoSnapshot = () => {
    undoSnapshotRef.current = null;
    setCanUndo(false);
  };

  const undoLastChange = () => {
    const snapshot = undoSnapshotRef.current;
    if (!snapshot) return;

    setActivePeriodKey(snapshot.activePeriodKey);
    setPeriods(snapshot.periods);
    setCurrency(snapshot.currency);
    clearUndoSnapshot();
    setSaveStatus("saving");
  };

  const changeActivePeriod = useCallback(
    (nextPeriodKey: MonthKey) => {
      if (nextPeriodKey === activePeriodKey) return;

      captureUndoSnapshot();

      setPeriods((currentPeriods) => {
        const previousPeriodKey = getPreviousMonthKey(nextPeriodKey);
        const previousPeriodForTemplate =
          currentPeriods[previousPeriodKey] ??
          (nextPeriodKey > activePeriodKey ? currentPeriods[activePeriodKey] : null);

        if (currentPeriods[nextPeriodKey]) {
          if (!previousPeriodForTemplate || nextPeriodKey < activePeriodKey) return currentPeriods;

          const syncedPeriod = syncPeriodTablesFromPreviousPeriod(
            currentPeriods[nextPeriodKey],
            previousPeriodForTemplate,
          );

          if (syncedPeriod === currentPeriods[nextPeriodKey]) return currentPeriods;

          return {
            ...currentPeriods,
            [nextPeriodKey]: syncedPeriod,
          };
        }

        return {
          ...currentPeriods,
          [nextPeriodKey]: createPeriodFromPreviousPeriod(previousPeriodForTemplate),
        };
      });

      setActivePeriodKey(nextPeriodKey);
    },
    [activePeriodKey, captureUndoSnapshot],
  );

  const goToPreviousPeriod = () => {
    changeActivePeriod(shiftMonthKey(activePeriodKey, -1));
  };

  const goToNextPeriod = () => {
    changeActivePeriod(shiftMonthKey(activePeriodKey, 1));
  };

  const goToCurrentPeriod = () => {
    changeActivePeriod(getCurrentMonthKey());
  };

  useEffect(() => {
    const data = loadLocalBudgetDB();

    setActivePeriodKey(data.activePeriodKey);
    setPeriods(data.periods);
    setCurrency(data.currency);
    setHasLoadedBudgetDB(true);
  }, []);

  useEffect(() => {
    return () => {
      if (hideSaveStatusTimeout.current) {
        window.clearTimeout(hideSaveStatusTimeout.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setPeriodSelectorPinned(window.scrollY > 32);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const updateActivePeriod = useCallback(
    (patch: Partial<MonthSnapshot>) => {
      setPeriods((currentPeriods) => {
        const currentPeriod = currentPeriods[activePeriodKey] ?? createEmptyPeriod();

        return {
          ...currentPeriods,
          [activePeriodKey]: {
            ...currentPeriod,
            ...patch,
          },
        };
      });
    },
    [activePeriodKey],
  );

  const updateTableRows = useCallback(
    (tableId: string, rows: RegistryRow[]) => {
      captureUndoSnapshot();

      setPeriods((currentPeriods) => {
        const currentPeriod = currentPeriods[activePeriodKey] ?? createEmptyPeriod();
        const nextTables = currentPeriod.tables.map((table) => (table.id === tableId ? { ...table, rows } : table));

        return {
          ...currentPeriods,
          [activePeriodKey]: {
            ...currentPeriod,
            tables: nextTables,
          },
        };
      });
    },
    [activePeriodKey, captureUndoSnapshot],
  );

  const updateTableSettings = useCallback(
    (tableId: string, settings: RegistryTableSettings) => {
      captureUndoSnapshot();

      setPeriods((currentPeriods) => {
        const currentPeriod = currentPeriods[activePeriodKey] ?? createEmptyPeriod();
        const nextTables = currentPeriod.tables.map((table) => (table.id === tableId ? { ...table, settings } : table));

        return {
          ...currentPeriods,
          [activePeriodKey]: {
            ...currentPeriod,
            tables: nextTables,
          },
        };
      });
    },
    [activePeriodKey, captureUndoSnapshot],
  );

  const updateTable = useCallback(
    (tableId: string, patch: Partial<BudgetTable>) => {
      captureUndoSnapshot();

      setPeriods((currentPeriods) => {
        const currentPeriod = currentPeriods[activePeriodKey] ?? createEmptyPeriod();

        return {
          ...currentPeriods,
          [activePeriodKey]: {
            ...currentPeriod,
            tables: currentPeriod.tables.map((table) => (table.id === tableId ? { ...table, ...patch } : table)),
          },
        };
      });
    },
    [activePeriodKey, captureUndoSnapshot],
  );

  const updateDashboardLayout = useCallback(
    (layout: DashboardGridLayoutItem[]) => {
      captureUndoSnapshot();

      setPeriods((currentPeriods) => {
        const currentPeriod = currentPeriods[activePeriodKey] ?? createEmptyPeriod();
        const tableById = new Map(currentPeriod.tables.map((table) => [table.id, table]));
        const orderedTables = layout
          .map(({ id, span }) => {
            const table = tableById.get(id);
            if (!table) return null;

            tableById.delete(id);
            return { ...table, dashboardSpan: span };
          })
          .filter((table) => table !== null);

        return {
          ...currentPeriods,
          [activePeriodKey]: {
            ...currentPeriod,
            tables: [...orderedTables, ...tableById.values()],
          },
        };
      });
    },
    [activePeriodKey, captureUndoSnapshot],
  );

  const openTableOptionsPopup = (event: MouseEvent<HTMLButtonElement>) => {
    setTableOptionsAnchor(event.currentTarget);
  };

  const closeTableOptionsPopup = () => {
    setTableOptionsAnchor(null);
  };

  const createTable = (type: BudgetTableType) => {
    const nextTableId = createId();
    const settingsAnchor = tableOptionsAnchor;

    captureUndoSnapshot();

    setPeriods((currentPeriods) => {
      const currentPeriod = currentPeriods[activePeriodKey] ?? createEmptyPeriod();

      const nextTable: BudgetTable = {
        id: nextTableId,
        seriesId: nextTableId,
        name: getNextTableName(currentPeriod.tables, type, dictionary.dashboard),
        type,
        visible: true,
        rows: [],
        accentColor: null,
        surfaceColorCustomized: false,
        backgroundImageUrl: null,
      };

      return {
        ...currentPeriods,
        [activePeriodKey]: {
          ...currentPeriod,
          tables: [...currentPeriod.tables, nextTable],
        },
      };
    });

    closeTableOptionsPopup();

    if (settingsAnchor) {
      setTableSettingsEditor({ anchorEl: settingsAnchor, tableId: nextTableId });
    }
  };

  const handleSelectTableOption = (option: GenericOptionsPopupOption) => {
    if (option.id === "income") {
      createTable("income");
      return;
    }

    if (option.id === "expense") {
      createTable("expense");
      return;
    }

    createTable("custom");
  };

  const requestDeleteTable = useCallback((tableId: string) => {
    if (tables.length <= 1) return;
    setTableIdPendingDelete(tableId);
  }, [tables.length]);

  const cancelDeleteTable = () => {
    setTableIdPendingDelete(null);
  };

  const confirmDeleteTable = () => {
    if (!tableIdPendingDelete || tables.length <= 1) return;

    captureUndoSnapshot();

    setPeriods((currentPeriods) => {
      const currentPeriod = currentPeriods[activePeriodKey] ?? createEmptyPeriod();

      return {
        ...currentPeriods,
        [activePeriodKey]: {
          ...currentPeriod,
          tables: currentPeriod.tables.filter((table) => table.id !== tableIdPendingDelete),
        },
      };
    });

    setTableIdPendingDelete(null);
  };

  const updateCustomFormulaPanels = useCallback(
    (panels: CustomFormulaPanel[]) => {
      captureUndoSnapshot();
      updateActivePeriod({ customFormulaPanels: panels });
    },
    [updateActivePeriod, captureUndoSnapshot],
  );

  const updateSavings = useCallback(
    (nextSavings: SavingItem[]) => {
      captureUndoSnapshot();
      updateActivePeriod({ savings: nextSavings });
    },
    [updateActivePeriod, captureUndoSnapshot],
  );

  useEffect(() => {
    if (!hasLoadedBudgetDB) return;

    if (shouldSkipFirstSave.current) {
      shouldSkipFirstSave.current = false;
      return;
    }

    if (hideSaveStatusTimeout.current) {
      window.clearTimeout(hideSaveStatusTimeout.current);
      hideSaveStatusTimeout.current = null;
    }

    setSaveStatus("saving");

    const saveTimeout = window.setTimeout(() => {
      try {
        const data: Partial<DashboardStore> = {
          currency,
          activePeriodKey,
          periods,
        };

        saveLocalBudgetDB(data);

        setSaveStatus("saved");

        hideSaveStatusTimeout.current = window.setTimeout(() => {
          setSaveStatus("idle");
          hideSaveStatusTimeout.current = null;
        }, 3200);
      } catch {
        setSaveStatus("error");
      }
    }, 650);

    return () => window.clearTimeout(saveTimeout);
  }, [currency, activePeriodKey, periods, hasLoadedBudgetDB]);

  const dashboardBlocks = useMemo<DashboardGridBlock[]>(
    () =>
      visibleTables.map((table: BudgetTable, index: number) => ({
        id: table.id,
        title: table.name,
        defaultSpan: table.dashboardSpan ?? getDashboardBlockSpan(index, visibleTables.length),
        resizable: true,
        surfaceStyle: {
          background:
            table.surfaceColorCustomized && table.accentColor
              ? table.accentColor
              : "var(--bf-surface-bg)",
          borderColor:
            table.surfaceColorCustomized && table.accentColor && !/gradient\(/i.test(table.accentColor)
              ? table.accentColor
              : "var(--bf-surface-border)",
          "--dbp-table-content-color":
            table.contentColor ??
            getReadableTextColor(table.surfaceColorCustomized ? table.accentColor : null),
          ...(table.backgroundImageUrl
            ? {
                backgroundImage: `url(${JSON.stringify(table.backgroundImageUrl)})`,
                backgroundPosition: "center",
                backgroundSize: "cover",
              }
            : {}),
        } as CSSProperties,
        content: (
          <div className="dbp-table-block">
            <div className="dbp-table-block__tools">
              <Tooltip title={dictionary.dashboard.tableSettings} arrow>
                <button
                  type="button"
                  className="dbp-table-block__settings-button"
                  onClick={(event) => setTableSettingsEditor({ anchorEl: event.currentTarget, tableId: table.id })}
                  aria-label={`${dictionary.dashboard.configureTable} ${table.name}`}
                >
                  <SettingsRoundedIcon fontSize="small" />
                </button>
              </Tooltip>

              {tables.length > 1 ? (
                <Tooltip title={dictionary.dashboard.deleteTable} arrow>
                  <button
                    type="button"
                    className="dbp-table-block__delete-button"
                    onClick={() => requestDeleteTable(table.id)}
                    aria-label={`${dictionary.dashboard.deleteTable} ${table.name}`}
                  >
                    <DeleteOutlineRoundedIcon fontSize="small" />
                  </button>
                </Tooltip>
              ) : null}
            </div>

            <RegistryTable
              title={table.name}
              invertComparison={table.type === "expense" || table.type === "debt"}
              rows={table.rows}
              settings={table.settings}
              previousRows={getMatchingPreviousTable(resolvedPreviousTableData.tables, table)?.rows ?? []}
              formulaVariables={resolvedTableData.variables}
              backgroundColor={table.tableBackgroundColor}
              contentColor={table.tableContentColor}
              outerContentColor={
                table.contentColor ??
                getReadableTextColor(table.surfaceColorCustomized ? table.accentColor : null)
              }
              onChangeRows={(rows) => updateTableRows(table.id, rows)}
              onChangeSettings={(settings) => updateTableSettings(table.id, settings)}
            />
          </div>
        ),
      })),
    [visibleTables, tables.length, updateTableRows, updateTableSettings, updateTable, requestDeleteTable, resolvedPreviousTableData, resolvedTableData, dictionary],
  );

  return (
    <main id="dashboard-page" className={periodSelectorPinned ? "dbp--period-pinned" : ""}>
      <Navbar />

      {saveStatus !== "idle" ? (
        <div className={`dbp-save dbp-save--${saveStatus}`}>
          <span className="dbp-save__icon">
            {saveStatus === "saving" ? <SyncRoundedIcon /> : null}
            {saveStatus === "saved" ? <CheckCircleRoundedIcon /> : null}
            {saveStatus === "error" ? <ErrorOutlineRoundedIcon /> : null}
          </span>

          <span className="dbp-save__label">
            {saveStatus === "saving" ? dictionary.dashboard.saving : null}
            {saveStatus === "saved" ? dictionary.dashboard.saved : null}
            {saveStatus === "error" ? dictionary.dashboard.saveFailed : null}
          </span>

          {saveStatus === "saved" && canUndo ? (
            <button type="button" className="dbp-save__undo-button" onClick={undoLastChange}>
              {dictionary.dashboard.undo}
            </button>
          ) : null}
        </div>
      ) : null}

      <section id="dashboard-page__period-selector">
        <PeriodSelector
          activePeriodKey={activePeriodKey}
          locale={activeLanguage.locale}
          onPreviousPeriod={goToPreviousPeriod}
          onNextPeriod={goToNextPeriod}
          onSelectPeriod={changeActivePeriod}
          onCurrentPeriod={goToCurrentPeriod}
        />
      </section>

      <section id="dashboard-page__main-content">
        <CustomFormulaBox
          tableVariables={resolvedTableData.variables}
          customFormulaPanels={customFormulaPanels}
          onChangeCustomFormulaPanels={updateCustomFormulaPanels}
        />

        <section id="dashboard-page__tables">
          <section id="dbp__tables_header">
            <div id="dbp__tables_heading">
              <p id="dbp__tables_eyebrow">{dictionary.dashboard.tablesEyebrow}</p>
              <h2 id="dbp__tables_title">{dictionary.dashboard.tablesTitle}</h2>
            </div>

            <button type="button" id="dbp__add_table_button" onClick={openTableOptionsPopup}>
              <AddRoundedIcon fontSize="small" />
              <span>{dictionary.dashboard.addTable}</span>
            </button>
          </section>

          <GenericOptionsPopup
            open={Boolean(tableOptionsAnchor)}
            anchorEl={tableOptionsAnchor}
            title={dictionary.dashboard.addTable}
            options={tableCreationOptions}
            onSelect={handleSelectTableOption}
            onClose={closeTableOptionsPopup}
          />

          <DashboardGrid blocks={dashboardBlocks} onLayoutChange={updateDashboardLayout} />
        </section>

        <section id="dashboard-page__savings">
          <div className="dbp_savings__section-heading">
            <p className="dbp_savings__tables-eyebrow">{dictionary.dashboard.savingsEyebrow}</p>
            <h2 className="dbp_savings__tables-title">{dictionary.dashboard.savingsTitle}</h2>
          </div>
          <Savings items={savings} onChange={updateSavings} />
        </section>
      </section>

      <GenericPopup
        open={Boolean(tablePendingDelete)}
        title={dictionary.dashboard.deleteTableTitle}
        description={`${dictionary.dashboard.deleteTablePrefix} ${tablePendingDelete?.name ?? dictionary.dashboard.thisTable}.`}
        confirmLabel={dictionary.common.delete}
        cancelLabel={dictionary.common.cancel}
        variant="danger"
        onConfirm={confirmDeleteTable}
        onCancel={cancelDeleteTable}
      />

      {tableBeingConfigured ? (
        <TableSettingsPopup
          key={tableBeingConfigured.id}
          table={tableBeingConfigured}
          anchorEl={tableSettingsEditor?.anchorEl ?? null}
          onChange={(patch) => updateTable(tableBeingConfigured.id, patch)}
          onClose={() => setTableSettingsEditor(null)}
        />
      ) : null}
    </main>
  );
};

export default DashboardPage;
