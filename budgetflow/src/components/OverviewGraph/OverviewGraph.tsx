import './OverviewGraph.style.less';

import { useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';

import { BarChart } from '@mui/x-charts/BarChart';
import { PieChart } from '@mui/x-charts/PieChart';

import { DragDropContext, Draggable, Droppable, type DropResult } from '@hello-pangea/dnd';

import type { OverviewGraphProps } from './OverviewGraph.types';

type ChartKind = 'bar' | 'pie1' | 'pie2';

type ChartItem = {
  id: ChartKind;
  title: string;
};

const clamp0 = (n: number) => (Number.isFinite(n) ? Math.max(0, n) : 0);

const sumAmounts = (rows: { amount: number | null }[]) =>
  rows.reduce((acc, r) => acc + (typeof r.amount === 'number' ? r.amount : 0), 0);

const toPieData = (rows: { label: string; amount: number | null }[]) =>
  rows
    .map((r) => ({ label: (r.label || '').trim() || '—', value: clamp0(typeof r.amount === 'number' ? r.amount : 0) }))
    .filter((x) => x.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

const reorder = <T,>(list: T[], startIndex: number, endIndex: number) => {
  const next = [...list];
  const [removed] = next.splice(startIndex, 1);
  next.splice(endIndex, 0, removed);
  return next;
};

const OverviewGraph = ({ earningsRows, expensesRows }: OverviewGraphProps) => {
  const [charts, setCharts] = useState<ChartItem[]>([
    { id: 'bar', title: 'Overview' },
    { id: 'pie1', title: 'Top earnings' },
    { id: 'pie2', title: 'Top expenses' },
  ]);

  const valueFormatter: any = (value: number) => `${value}`;

  const barTotals = useMemo(() => {
    const earningsTotal = sumAmounts(earningsRows);
    const expensesTotal = sumAmounts(expensesRows);
    return { earningsTotal, expensesTotal };
  }, [earningsRows, expensesRows]);

  const pieEarnings = useMemo(() => toPieData(earningsRows), [earningsRows]);
  const pieExpenses = useMemo(() => toPieData(expensesRows), [expensesRows]);

  const onDragEnd = (result: DropResult) => {
    const destinationIndex = result.destination?.index;
    if (destinationIndex === undefined) return;
    const sourceIndex = result.source.index;
    if (destinationIndex === sourceIndex) return;
    setCharts((prev) => reorder(prev, sourceIndex, destinationIndex));
  };

  const renderChart = (id: ChartKind) => {
    if (id === 'bar') {
      return (
        <Box className="bf-graph__chart">
          <BarChart
            series={[
              { data: [barTotals.earningsTotal], label: 'Earnings', id: 'earnings' },
              { data: [barTotals.expensesTotal], label: 'Expenses', id: 'expenses' },
            ]}
            xAxis={[{ data: ['Totals'], height: 28 }]}
            yAxis={[{ width: 56 }]}
          />
        </Box>
      );
    }

    if (id === 'pie1') {
      return (
        <PieChart
          series={[
            {
              data: pieEarnings.length ? pieEarnings : [{ label: '—', value: 1 }],
              highlightScope: { fade: 'global', highlight: 'item' },
              faded: { innerRadius: 30, additionalRadius: -30, color: 'gray' },
              valueFormatter,
            },
          ]}
          height={300}
          width={300}
        />
      );
    }

    return (
      <PieChart
        series={[
          {
            data: pieExpenses.length ? pieExpenses : [{ label: '—', value: 1 }],
            highlightScope: { fade: 'global', highlight: 'item' },
            faded: { innerRadius: 30, additionalRadius: -30, color: 'gray' },
            valueFormatter,
          },
        ]}
        height={300}
        width={300}
      />
    );
  };

  return (
    <main id="overview-graph">
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="overview-graph-grid" direction="horizontal">
          {(droppableProvided) => (
            <div id="overview-graph-container" ref={droppableProvided.innerRef} {...droppableProvided.droppableProps}>
              {charts.map((c, index) => (
                <Draggable draggableId={c.id} index={index} key={c.id}>
                  {(draggableProvided, draggableSnapshot) => (
                    <section
                      ref={draggableProvided.innerRef}
                      {...draggableProvided.draggableProps}
                      className={
                        draggableSnapshot.isDragging
                          ? 'bf-bubble-surface bf-graph__card bf-graph__card--dragging'
                          : 'bf-bubble-surface bf-graph__card'
                      }
                    >
                      <header className="bf-graph__card-header" {...draggableProvided.dragHandleProps}>
                        <span className="bf-graph__drag">
                          <DragIndicatorIcon fontSize="small" />
                        </span>
                        <span className="bf-graph__title">{c.title}</span>
                      </header>
                      <div className="bf-graph__card-body">{renderChart(c.id)}</div>
                    </section>
                  )}
                </Draggable>
              ))}

              {droppableProvided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </main>
  );
};

export default OverviewGraph;