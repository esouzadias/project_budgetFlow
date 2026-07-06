import "./DashboardPage.style.less";

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import SyncRoundedIcon from "@mui/icons-material/SyncRounded";

import Navbar from "../../components/NavBar/Navbar";
import RegistryTable from "../../components/RegistryTable/RegistryTable";
import DashboardGrid, { type DashboardGridBlock } from "./components/DashboardGrid";
import CustomFormulaBox from "../../components/CustomFormulaBox/CustomFormulaBox";
import GenericPopup from "../../components/GenericPopup/GenericPopup";
import GenericOptionsPopup, { type GenericOptionsPopupOption } from "../../components/GenericOptionsPopup/GenericOptionsPopup";
import PeriodSelector from "../../components/PeriodSelector/PeriodSelector";
import { loadLocalBudgetDB, saveLocalBudgetDB } from "../../storage/budgetStorage";

import type { RegistryRow } from "../../components/RegistryTable/RegistryTable.types";
import type {
  BudgetTable,
  BudgetTableType,
  CustomFormulaPanel,
  DashboardChart,
  DashboardStore,
  MonthKey,
  MonthSnapshot,
} from "./DashboardPage.types";

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
  },
  {
    id: createId(),
    title: "Total Expenses",
    expression: "total_expenses",
    accent: "red",
    iconId: "receipt",
    iconImageUrl: null,
    color: "#ea4335",
  },
  {
    id: createId(),
    title: "Balance",
    expression: "total_income - total_expenses",
    accent: "blue",
    iconId: "bank",
    iconImageUrl: null,
    color: "#1a73e8",
  },
];

const createEmptyPeriod = (): MonthSnapshot => ({
  tables: [
    {
      id: "table-income",
      name: "Income",
      type: "income",
      visible: true,
      rows: [],
    },
    {
      id: "table-expenses",
      name: "Expenses",
      type: "expense",
      visible: true,
      rows: [],
    },
  ],
  customFormulaPanels: createDefaultFormulaPanels(),
  charts: [],
});

type UndoSnapshot = {
  activePeriodKey: MonthKey;
  periods: Record<MonthKey, MonthSnapshot>;
  currency: string;
};

const tableCreationOptions: GenericOptionsPopupOption[] = [
  {
    id: "income",
    label: "Income",
    description: "Create a new income table.",
  },
  {
    id: "expense",
    label: "Expenses",
    description: "Create a new expenses table.",
  },
  {
    id: "custom",
    label: "Custom",
    description: "Create a blank custom table.",
  },
];

const getTableBaseName = (type: BudgetTableType) => {
  if (type === "income") return "Income";
  if (type === "expense") return "Expenses";
  if (type === "saving") return "Savings";
  if (type === "debt") return "Debt";

  return "Custom Table";
};

const getNextTableName = (tables: BudgetTable[], type: BudgetTableType) => {
  const baseName = getTableBaseName(type);
  const matchingCount = tables.filter((table) => table.type === type).length;

  if (matchingCount === 0) return baseName;

  return `${baseName} ${matchingCount + 1}`;
};

const getDashboardBlockSize = (index: number, totalBlocks: number) => {
  const rowStartIndex = Math.floor(index / 3) * 3;
  const rowItemCount = Math.min(3, totalBlocks - rowStartIndex);

  if (rowItemCount === 1) return "full" as const;
  if (rowItemCount === 2) return "half" as const;

  return "third" as const;
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

const cloneRecurringRows = (rows: RegistryRow[]): RegistryRow[] => {
  return rows
    .filter((row) => row.recurring)
    .map((row) => ({
      ...row,
      id: createId(),
    }));
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

const createPeriodFromPreviousPeriod = (previousPeriod?: MonthSnapshot | null): MonthSnapshot => {
  if (!previousPeriod) return createEmptyPeriod();

  return {
    tables: previousPeriod.tables.map((table) => ({
      ...table,
      id: createId(),
      rows: cloneRecurringRows(table.rows),
    })),
    customFormulaPanels:
      previousPeriod.customFormulaPanels.length > 0
        ? cloneFormulaPanels(previousPeriod.customFormulaPanels)
        : createDefaultFormulaPanels(),
    charts: cloneCharts(previousPeriod.charts),
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
  const [activePeriodKey, setActivePeriodKey] = useState<MonthKey>(getCurrentMonthKey());
  const [periods, setPeriods] = useState<Record<MonthKey, MonthSnapshot>>({});
  const [currency, setCurrency] = useState("EUR");
  const [tableIdPendingDelete, setTableIdPendingDelete] = useState<string | null>(null);
  const [tableOptionsAnchor, setTableOptionsAnchor] = useState<HTMLElement | null>(null);
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
  const previousPeriod = periods[getPreviousMonthKey(activePeriodKey)] ?? null;

  const visibleTables = useMemo(
    () => tables.filter((table: BudgetTable) => table.visible),
    [tables],
  );

  const incomeRows = useMemo<RegistryRow[]>(
    () => tables.find((table) => table.type === "income")?.rows ?? [],
    [tables],
  );

  const expenseRows = useMemo<RegistryRow[]>(
    () => tables.find((table) => table.type === "expense")?.rows ?? [],
    [tables],
  );

  const tablePendingDelete = useMemo(
    () => tables.find((table: BudgetTable) => table.id === tableIdPendingDelete) ?? null,
    [tables, tableIdPendingDelete],
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

  const changeActivePeriod = useCallback((nextPeriodKey: MonthKey) => {
    captureUndoSnapshot();

    setPeriods((currentPeriods) => {
      if (currentPeriods[nextPeriodKey]) return currentPeriods;

      const previousPeriodKey = getPreviousMonthKey(nextPeriodKey);
      const previousPeriodForTemplate = currentPeriods[previousPeriodKey] ?? currentPeriods[activePeriodKey] ?? createEmptyPeriod();

      return {
        ...currentPeriods,
        [nextPeriodKey]: createPeriodFromPreviousPeriod(previousPeriodForTemplate),
      };
    });

    setActivePeriodKey(nextPeriodKey);
  }, [activePeriodKey, captureUndoSnapshot]);

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

  const updateActivePeriod = useCallback((patch: Partial<MonthSnapshot>) => {
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
  }, [activePeriodKey]);

  const updateTableRows = useCallback((tableId: string, rows: RegistryRow[]) => {
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
  }, [activePeriodKey, captureUndoSnapshot]);

  const openTableOptionsPopup = (event: MouseEvent<HTMLButtonElement>) => {
    setTableOptionsAnchor(event.currentTarget);
  };

  const closeTableOptionsPopup = () => {
    setTableOptionsAnchor(null);
  };

  const createTable = (type: BudgetTableType) => {
    captureUndoSnapshot();

    setPeriods((currentPeriods) => {
      const currentPeriod = currentPeriods[activePeriodKey] ?? createEmptyPeriod();

      const nextTable: BudgetTable = {
        id: createId(),
        name: getNextTableName(currentPeriod.tables, type),
        type,
        visible: true,
        rows: [],
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

  const requestDeleteTable = (tableId: string) => {
    setTableIdPendingDelete(tableId);
  };

  const cancelDeleteTable = () => {
    setTableIdPendingDelete(null);
  };

  const confirmDeleteTable = () => {
    if (!tableIdPendingDelete) return;

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

  const updateCustomFormulaPanels = useCallback((panels: CustomFormulaPanel[]) => {
    captureUndoSnapshot();
    updateActivePeriod({ customFormulaPanels: panels });
  }, [updateActivePeriod, captureUndoSnapshot]);

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
        defaultSize: getDashboardBlockSize(index, visibleTables.length),
        content: (
          <div className="dashboard-page__table-block">
            <button
              type="button"
              className="dashboard-page__table-delete-button"
              onClick={() => requestDeleteTable(table.id)}
              aria-label={`Delete ${table.name}`}
            >
              <DeleteOutlineRoundedIcon fontSize="small" />
            </button>

            <RegistryTable
              title={table.name}
              invertComparison={table.type === "expense" || table.type === "debt"}
              rows={table.rows}
              previousRows={getMatchingPreviousTable(previousPeriod?.tables ?? [], table)?.rows ?? []}
              onChangeRows={(rows) => updateTableRows(table.id, rows)}
            />
          </div>
        ),
      })),
    [visibleTables, updateTableRows, previousPeriod],
  );

  return (
    <main id="dashboard-page" className={periodSelectorPinned ? "dashboard-page--period-pinned" : ""}>
      <Navbar />

      {saveStatus !== "idle" ? (
        <div className={`dashboard-page__save-indicator dashboard-page__save-indicator--${saveStatus}`}>
          <span className="dashboard-page__save-icon-wrap">
            {saveStatus === "saving" ? <SyncRoundedIcon /> : null}
            {saveStatus === "saved" ? <CheckCircleRoundedIcon /> : null}
            {saveStatus === "error" ? <ErrorOutlineRoundedIcon /> : null}
          </span>

          <span className="dashboard-page__save-label">
            {saveStatus === "saving" ? "Saving" : null}
            {saveStatus === "saved" ? "Saved" : null}
            {saveStatus === "error" ? "Save failed" : null}
          </span>

          {saveStatus === "saved" && canUndo ? (
            <button type="button" className="dashboard-page__undo-button" onClick={undoLastChange}>
              Undo
            </button>
          ) : null}
        </div>
      ) : null}

      <section className="dashboard-page__period-selector-section">
        <PeriodSelector
          activePeriodKey={activePeriodKey}
          locale="en-US"
          onPreviousPeriod={goToPreviousPeriod}
          onNextPeriod={goToNextPeriod}
          onCurrentPeriod={goToCurrentPeriod}
        />
      </section>

      <section id="customFormulas">
        <CustomFormulaBox
          incomeRows={incomeRows}
          expenseRows={expenseRows}
          customFormulaPanels={customFormulaPanels}
          onChangeCustomFormulaPanels={updateCustomFormulaPanels}
        />
      </section>

      <section id="tables" className="dashboard-page__tables-header">
        <div>
          <p className="dashboard-page__tables-eyebrow">Tables</p>
          <h2 className="dashboard-page__tables-title">Budget tables</h2>
        </div>

        <button type="button" className="dashboard-page__add-table-button" onClick={openTableOptionsPopup}>
          <AddRoundedIcon fontSize="small" />
          <span>Add new table</span>
        </button>
      </section>

      <section id="charts"></section>

      <GenericOptionsPopup
        open={Boolean(tableOptionsAnchor)}
        anchorEl={tableOptionsAnchor}
        title="Add new table"
        options={tableCreationOptions}
        onSelect={handleSelectTableOption}
        onClose={closeTableOptionsPopup}
      />

      <DashboardGrid blocks={dashboardBlocks} />

      <GenericPopup
        open={Boolean(tablePendingDelete)}
        title="Delete table?"
        description={`This will permanently delete ${tablePendingDelete?.name ?? "this table"}.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={confirmDeleteTable}
        onCancel={cancelDeleteTable}
      />
    </main>
  );
};

export default DashboardPage;