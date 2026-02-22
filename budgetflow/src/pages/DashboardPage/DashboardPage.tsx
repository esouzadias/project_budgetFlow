import "./DashboardPage.style.less";

import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";

import Navbar from "../../components/NavBar/Navbar";
import DragDropContainer from "../../components/DragDropContainer/DragDropContainer";

import BarChart from "../../components/BarChart/BarChart";
import Piechart from "../../components/Piechart/Piechart";

import RegistryTable from "../../components/RegistryTable/RegistryTable";
import Savings from "../Savings/Savings";

import type { RegistryRow } from "../../components/RegistryTable/RegistryTable.types";
import type { SavingItem } from "../Savings/Savings.type";

const createId = () => crypto.randomUUID();

const DashboardPage = () => {
  const [earningsRows, setEarningsRows] = useState<RegistryRow[]>([
    {
      id: createId(),
      label: "Paycheck",
      amount: 1200,
      prevAmount: 1150,
      note: "",
      iconId: "work",
      color: "#1a73e8",
      categories: ["Salary"],
      recurring: false,
    },
  ]);

  const [expensesRows, setExpensesRows] = useState<RegistryRow[]>([
    {
      id: createId(),
      label: "Rent",
      amount: 650,
      prevAmount: 650,
      note: "",
      iconId: "home",
      color: "#1e40af",
      categories: ["House"],
      recurring: true,
    },
  ]);

  const [savingsItems, setSavingsItems] = useState<SavingItem[]>([]);

  const [blockOrder, setBlockOrder] = useState<string[]>([
    "bar",
    "pie-earnings",
    "pie-expenses",
    "earnings",
    "expenses",
    "savings",
  ]);

  // ---- FLIP animation plumbing ----
  const blockRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const prevRectsRef = useRef<Map<string, DOMRect> | null>(null);

  const measureRects = () => {
    const map = new Map<string, DOMRect>();
    for (const id of blockOrder) {
      const el = blockRefs.current[id];
      if (el) map.set(id, el.getBoundingClientRect());
    }
    return map;
  };

  const onMoveBlock = (sourceId: string, targetId: string) => {
    setBlockOrder((prev) => {
      const from = prev.indexOf(sourceId);
      const to = prev.indexOf(targetId);
      if (from < 0 || to < 0 || from === to) return prev;

      prevRectsRef.current = measureRects();

      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  useLayoutEffect(() => {
    const prevRects = prevRectsRef.current;
    if (!prevRects) return;

    const nextRects = measureRects();

    for (const [id, nextRect] of nextRects.entries()) {
      const prevRect = prevRects.get(id);
      const el = blockRefs.current[id];
      if (!prevRect || !el) continue;

      const dx = prevRect.left - nextRect.left;
      const dy = prevRect.top - nextRect.top;

      if (dx === 0 && dy === 0) continue;

      el.style.transition = "transform 0s";
      el.style.transform = `translate(${dx}px, ${dy}px)`;

      requestAnimationFrame(() => {
        el.style.transition = "transform 220ms var(--bf-ease)";
        el.style.transform = "translate(0px, 0px)";
      });
    }

    prevRectsRef.current = null;
  }, [blockOrder]);

  // ---- blocks ----
  const blocks: Record<string, ReactNode> = useMemo(
    () => ({
      bar: (
        <DragDropContainer id="bar" scope="dashboard" title="Overview (Bar)" onMove={onMoveBlock}>
          <BarChart earningsRows={earningsRows} expensesRows={expensesRows} />
        </DragDropContainer>
      ),

      "pie-earnings": (
        <DragDropContainer id="pie-earnings" className="pie-menu" scope="dashboard" title="Top Earnings" onMove={onMoveBlock}>
          <Piechart rows={earningsRows} />
        </DragDropContainer>
      ),

      "pie-expenses": (
        <DragDropContainer id="pie-expenses" className="pie-menu" scope="dashboard" title="Top Expenses" onMove={onMoveBlock}>
          <Piechart rows={expensesRows} />
        </DragDropContainer>
      ),

      earnings: (
        <DragDropContainer id="earnings" scope="dashboard" title="Earnings" onMove={onMoveBlock}>
          <RegistryTable title="Earnings" rows={earningsRows} onChangeRows={setEarningsRows} />
        </DragDropContainer>
      ),

      expenses: (
        <DragDropContainer id="expenses" scope="dashboard" title="Expenses" onMove={onMoveBlock}>
          <RegistryTable
            title="Expenses"
            invertComparison
            rows={expensesRows}
            onChangeRows={setExpensesRows}
          />
        </DragDropContainer>
      ),

      savings: (
        <DragDropContainer id="savings" scope="dashboard" title="Savings" onMove={onMoveBlock}>
          <Savings items={savingsItems} onChange={setSavingsItems} />
        </DragDropContainer>
      ),
    }),
    [earningsRows, expensesRows, savingsItems],
  );

  return (
    <main id="dashboard-page">
      <Navbar />

      <div id="dashboard-page-container">
        {blockOrder.map((id) => (
          <div
            key={id}
            className="bf-dashboard__block"
            ref={(el) => {
              blockRefs.current[id] = el;
            }}
          >
            {blocks[id]}
          </div>
        ))}
      </div>
    </main>
  );
};

export default DashboardPage;