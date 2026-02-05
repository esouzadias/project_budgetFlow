import './DashboardPage.style.less';

import { useState } from 'react';

import Navbar from '../../components/NavBar/Navbar';
import OverviewGraph from '../../components/OverviewGraph/OverviewGraph';
import EarningsAndExpenses from '../EarningsAndExpenses/EarningsAndExpenses';
import Savings from '../Savings/Savings';

import type { RegistryRow } from '../../components/RegistryTable/RegistryTable.types';
import type { SavingItem } from '../Savings/Savings.type';

type Props = {};

const createId = () => crypto.randomUUID();

const DashboardPage = ({}: Props) => {
  const [earningsRows, setEarningsRows] = useState<RegistryRow[]>([
    {
      id: createId(),
      label: 'Paycheck',
      amount: 1200,
      prevAmount: 1150,
      note: '',
      iconId: 'work',
      color: '#1a73e8',
      categories: ['Salary'],
      recurring: false,
    },
    {
      id: createId(),
      label: 'Other',
      amount: 284.84,
      prevAmount: 320,
      note: '',
      iconId: 'other',
      color: '#34a853',
      categories: ['Misc'],
      recurring: false,
    },
    {
      id: createId(),
      label: 'Leftover',
      amount: 55,
      prevAmount: null,
      note: '',
      iconId: 'home',
      color: '#a142f4',
      categories: [],
      recurring: false,
    },
  ]);

  const [expensesRows, setExpensesRows] = useState<RegistryRow[]>([
    {
      id: createId(),
      label: 'Rent',
      amount: 650,
      prevAmount: 650,
      note: '',
      iconId: 'home',
      color: '#1e40af',
      categories: ['House'],
      recurring: true,
    },
    {
      id: createId(),
      label: 'Groceries',
      amount: 220.5,
      prevAmount: 210.0,
      note: '',
      iconId: 'groceries',
      color: '#10b981',
      categories: ['Food'],
      recurring: false,
    },
    {
      id: createId(),
      label: 'Subscriptions',
      amount: 29.99,
      prevAmount: 29.99,
      note: '',
      iconId: 'subs',
      color: '#ef4444',
      categories: ['Services'],
      recurring: true,
    },
  ]);

  const [savingsItems, setSavingsItems] = useState<SavingItem[]>([
    {
      id: createId(),
      name: 'Emergency Fund',
      iconId: 'savings',
      color: '#34a853',
      goalAmount: 2000,
      transactions: [
        { id: createId(), amount: 150, note: 'Initial deposit', createdAt: Date.now() - 1000 * 60 * 60 * 24 * 14 },
        { id: createId(), amount: 50, note: 'Top up', createdAt: Date.now() - 1000 * 60 * 60 * 24 * 3 },
      ],
    },
    {
      id: createId(),
      name: 'Trip',
      iconId: 'travel',
      color: '#a142f4',
      goalAmount: null,
      transactions: [{ id: createId(), amount: 120, note: 'Start', createdAt: Date.now() - 1000 * 60 * 60 * 24 * 5 }],
    },
    {
      id: createId(),
      name: 'New Laptop',
      iconId: 'laptop',
      color: '#1a73e8',
      goalAmount: 1500,
      transactions: [{ id: createId(), amount: 200, note: 'Kickoff', createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2 }],
    },
  ]);

  return (
    <main id="dashboard-page">
      <Navbar />

      <div id="dashboard-page-container">
        <div id="dashboard-overview-graph">
          <OverviewGraph earningsRows={earningsRows} expensesRows={expensesRows} savingsItems={savingsItems} />
        </div>

        <EarningsAndExpenses
          monthKey={'2026-02'}
          earningsRows={earningsRows}
          expensesRows={expensesRows}
          onChangeEarnings={setEarningsRows}
          onChangeExpenses={setExpensesRows}
        />

        <Savings items={savingsItems} onChange={setSavingsItems} />
      </div>
    </main>
  );
};

export default DashboardPage;