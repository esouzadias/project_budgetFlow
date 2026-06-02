import "./DashboardPage.style.less";

import { useMemo, useState } from "react";

import Navbar from "../../components/NavBar/Navbar";
import RegistryTable from "../../components/RegistryTable/RegistryTable";
import DashboardGrid, { type DashboardGridBlock } from "./components/DashboardGrid";
import CustomFormulaBox from "../../components/CustomFormulaBox/CustomFormulaBox";

import type { RegistryRow } from "../../components/RegistryTable/RegistryTable.types";

const DashboardPage = () => {
  const [incomeRows, setIncomeRows] = useState<RegistryRow[]>([]);
  const [expenseRows, setExpenseRows] = useState<RegistryRow[]>([]);

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
      <CustomFormulaBox incomeRows={incomeRows} expenseRows={expenseRows} />
      <DashboardGrid blocks={dashboardBlocks} />
    </main>
  );
};

export default DashboardPage;