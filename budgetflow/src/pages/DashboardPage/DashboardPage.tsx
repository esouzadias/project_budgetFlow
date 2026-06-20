import "./DashboardPage.style.less";

import { useEffect, useMemo, useRef, useState } from "react";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import SyncRoundedIcon from "@mui/icons-material/SyncRounded";

import Navbar from "../../components/NavBar/Navbar";
import RegistryTable from "../../components/RegistryTable/RegistryTable";
import DashboardGrid, { type DashboardGridBlock } from "./components/DashboardGrid";
import CustomFormulaBox from "../../components/CustomFormulaBox/CustomFormulaBox";
import { loadLocalBudgetDB, saveLocalBudgetDB } from "../../storage/budgetStorage";

import type { RegistryRow } from "../../components/RegistryTable/RegistryTable.types";

const DashboardPage = () => {
  const [incomeRows, setIncomeRows] = useState<RegistryRow[]>([]);
  const [expenseRows, setExpenseRows] = useState<RegistryRow[]>([]);
  const [customFormulaPanels, setCustomFormulaPanels] = useState<any[]>([]);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [hasLoadedBudgetDB, setHasLoadedBudgetDB] = useState(false);
  const shouldSkipFirstSave = useRef(true);
  const hideSaveStatusTimeout = useRef<number | null>(null);

  useEffect(() => { //Runs the first time the page is loaded to fetch the data from localStorage
    const data = loadLocalBudgetDB(); //Simulating api call

    setIncomeRows(data.incomeRows);
    setExpenseRows(data.expenseRows);
    setCustomFormulaPanels(data.customFormulaPanels);
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
        saveLocalBudgetDB({
          incomeRows,
          expenseRows,
          customFormulaPanels,
        });

        setSaveStatus("saved");

        hideSaveStatusTimeout.current = window.setTimeout(() => {
          setSaveStatus("idle");
          hideSaveStatusTimeout.current = null;
        }, 1400);
      } catch {
        setSaveStatus("error");
      }
    }, 650);

    return () => window.clearTimeout(saveTimeout);
  }, [incomeRows, expenseRows, customFormulaPanels, hasLoadedBudgetDB]);

  const dashboardBlocks = useMemo<DashboardGridBlock[]>(
    () => [
      {
        id: "income",
        title: "Income",
        defaultSize: "half",
        content: <RegistryTable title="Income" rows={incomeRows} onChangeRows={setIncomeRows} />,
      },
      {
        id: "expenses",
        title: "Expenses",
        defaultSize: "half",
        content: <RegistryTable title="Expenses" invertComparison rows={expenseRows} onChangeRows={setExpenseRows} />,
      },
    ],
    [incomeRows, expenseRows],
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
        </div>
      ) : null}

      <CustomFormulaBox
        incomeRows={incomeRows}
        expenseRows={expenseRows}
        customFormulaPanels={customFormulaPanels}
        onChangeCustomFormulaPanels={setCustomFormulaPanels}
      />
      <DashboardGrid blocks={dashboardBlocks} />
    </main>
  );
};

export default DashboardPage;