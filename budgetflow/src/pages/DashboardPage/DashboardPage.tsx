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
import { loadLocalBudgetDB, saveLocalBudgetDB } from "../../storage/budgetStorage";

import type { RegistryRow } from "../../components/RegistryTable/RegistryTable.types";
import type { BudgetTable, BudgetTableType, DashboardStore, MonthKey, MonthSnapshot } from "./DashboardPage.types";

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
  customFormulaPanels: [],
  charts: [],
});

const createId = () => crypto.randomUUID();

type UndoSnapshot = {
  activePeriodKey: MonthKey;
  periods: Record<MonthKey, MonthSnapshot>;
  currency: string;
  customFormulaPanels: any[];
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

const DashboardPage = () => {
  const [activePeriodKey, setActivePeriodKey] = useState<MonthKey>("2026-06");
  const [periods, setPeriods] = useState<Record<MonthKey, MonthSnapshot>>({});
  const [currency, setCurrency] = useState("EUR");
  const [customFormulaPanels, setCustomFormulaPanels] = useState<any[]>([]);
  const [tableIdPendingDelete, setTableIdPendingDelete] = useState<string | null>(null);
  const [tableOptionsAnchor, setTableOptionsAnchor] = useState<HTMLElement | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [hasLoadedBudgetDB, setHasLoadedBudgetDB] = useState(false);
  const [canUndo, setCanUndo] = useState(false);

  const shouldSkipFirstSave = useRef(true);
  const hideSaveStatusTimeout = useRef<number | null>(null);
  const undoSnapshotRef = useRef<UndoSnapshot | null>(null);

  const activePeriod = periods[activePeriodKey] ?? createEmptyPeriod();
  const tables = activePeriod.tables;

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
      customFormulaPanels,
    };

    setCanUndo(true);
  }, [activePeriodKey, periods, currency, customFormulaPanels]);

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
    setCustomFormulaPanels(snapshot.customFormulaPanels);
    clearUndoSnapshot();
    setSaveStatus("saving");
  };

  useEffect(() => {
    const data = loadLocalBudgetDB();
    const loadedPeriod = data.periods[data.activePeriodKey] ?? createEmptyPeriod();

    setActivePeriodKey(data.activePeriodKey);
    setPeriods(data.periods);
    setCurrency(data.currency);
    setCustomFormulaPanels(loadedPeriod.customFormulaPanels);
    setHasLoadedBudgetDB(true);
  }, []);

  useEffect(() => {
    setCustomFormulaPanels(activePeriod.customFormulaPanels);
  }, [activePeriod.customFormulaPanels]);

  useEffect(() => {
    return () => {
      if (hideSaveStatusTimeout.current) {
        window.clearTimeout(hideSaveStatusTimeout.current);
      }
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

  const updateCustomFormulaPanels = useCallback((panels: any[]) => {
    captureUndoSnapshot();
    setCustomFormulaPanels(panels);
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
        }, 5200);
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
              onChangeRows={(rows) => updateTableRows(table.id, rows)}
            />
          </div>
        ),
      })),
    [visibleTables, updateTableRows],
  );

  return (
    <main id="dashboard-page">
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

      <section id="charts">
        
      </section>

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