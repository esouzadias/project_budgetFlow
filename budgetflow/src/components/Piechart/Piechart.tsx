import './Piechart.style.less';

import { useMemo } from 'react';
import { Box } from '@mui/material';
import { PieChart as MuiPieChart } from '@mui/x-charts/PieChart';

import type { RegistryRow } from '../../components/RegistryTable/RegistryTable.types';

type Props = {
  rows: RegistryRow[];
  title?: string;
};

const clamp = (n: number) => (Number.isFinite(n) ? Math.max(0, n) : 0);

const toPieData = (rows: RegistryRow[]) =>
  rows
    .map((r) => ({
      label: r.label || '—',
      value: clamp(typeof r.amount === 'number' ? r.amount : 0),
    }))
    .filter((x) => x.value > 0)
    .slice(0, 8);

const Piechart = ({ rows }: Props) => {
  const data = useMemo(() => toPieData(rows), [rows]);

  return (
    <Box className="bf-graph__chart">
      <MuiPieChart
        series={[
          {
            data: data.length ? data : [{ label: '—', value: 1 }],
            innerRadius: 30,
          },
        ]}
        height={260}
      />
    </Box>
  );
};

export default Piechart;