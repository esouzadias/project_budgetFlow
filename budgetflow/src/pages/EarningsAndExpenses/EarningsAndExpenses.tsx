import RegistryTable from '../../components/RegistryTable/RegistryTable';
import './EarningsAndExpenses.style.less';

import type { RegistryRow } from '../../components/RegistryTable/RegistryTable.types';
import type { MonthKey } from '../DashboardPage/DashboardPage.types';

type Props = {
  monthKey: MonthKey;
  earningsRows: RegistryRow[];
  expensesRows: RegistryRow[];
  onChangeEarnings: (rows: RegistryRow[]) => void;
  onChangeExpenses: (rows: RegistryRow[]) => void;
};

const EarningsAndExpenses = ({
  earningsRows,
  expensesRows,
  onChangeEarnings,
  onChangeExpenses,
}: Props) => {
  return (
    <main id="earnings-and-expenses-page">
      <div id="earnings-and-expenses-container">
        <RegistryTable
          title="Earnings"
          invertComparison={false}
          rows={earningsRows}
          onChangeRows={onChangeEarnings}
        />
        <RegistryTable
          title="Expenses"
          invertComparison
          rows={expensesRows}
          onChangeRows={onChangeExpenses}
        />
      </div>
    </main>
  );
};

export default EarningsAndExpenses;