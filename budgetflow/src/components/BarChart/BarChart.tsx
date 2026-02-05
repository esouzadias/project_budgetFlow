import './BarChart.style.less';

import { useMemo } from 'react';
import { Box } from '@mui/material';
import { BarChart as MuiBarChart } from '@mui/x-charts/BarChart';

import type { RegistryRow } from '../../components/RegistryTable/RegistryTable.types';

type Props = {
  earningsRows: RegistryRow[];
  expensesRows: RegistryRow[];
};

const sum = (rows: RegistryRow[]) =>
  rows.reduce((acc, r) => acc + (typeof r.amount === 'number' ? r.amount : 0), 0);

const BarChart = ({ earningsRows, expensesRows }: Props) => {
  const totals = useMemo(
    () => ({
      earnings: sum(earningsRows),
      expenses: sum(expensesRows),
    }),
    [earningsRows, expensesRows],
  );

  return (
    <Box className="bf-graph__chart">
      <MuiBarChart
        series={[
          { id: 'earnings', label: 'Earnings', data: [totals.earnings] },
          { id: 'expenses', label: 'Expenses', data: [totals.expenses] },
        ]}
        xAxis={[{ data: ['Total'], scaleType: 'band' }]}
        yAxis={[{ width: 56 }]}
        height={260}
      />
    </Box>
  );
};

export default BarChart;