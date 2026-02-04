import RegistryTable from '../../components/RegistryTable/RegistryTable';
import './EarningsAndExpenses.style.less';

export default function EarningsAndExpenses() {
  return (
    <main id="earnings-and-expenses-page">
      <div id="earnings-and-expenses-container">
        <RegistryTable title="Earnings" invertComparison={false} />
        <RegistryTable title="Expenses" invertComparison />
      </div>
    </main>
  );
}