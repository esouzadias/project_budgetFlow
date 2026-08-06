import { evaluateNumericExpression } from "../components/GenericInput/GenericInput.utils";

import type { FormulaVariable, FormulaVariableSource } from "../components/VariablesViewer/VariablesViewer";
import type { BudgetTable } from "../pages/DashboardPage/DashboardPage.types";

const normalizeFormulaKey = (value: string) => {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
};

const getVariableSource = (table: BudgetTable): FormulaVariableSource => {
  if (table.type === "income") return "income";
  if (table.type === "expense" || table.type === "debt") return "expense";
  if (table.type === "saving") return "saving";

  return "table";
};

export type ResolvedTableFormulaData = {
  tables: BudgetTable[];
  variables: FormulaVariable[];
};

export const resolveTableFormulaData = (tables: BudgetTable[]): ResolvedTableFormulaData => {
  const usedKeys = new Set<string>(["total_income", "total_expenses", "total_savings", "balance"]);
  const baseKeyCount = new Map<string, number>();
  const rowVariableById = new Map<string, FormulaVariable>();

  for (const table of tables) {
    const tableKey = normalizeFormulaKey(table.name) || "table";

    table.rows.forEach((row, rowIndex) => {
      const cleanLabel = row.label.trim();
      const baseKey = normalizeFormulaKey(cleanLabel) || `${tableKey}_row_${rowIndex + 1}`;
      const duplicateIndex = baseKeyCount.get(baseKey) ?? 0;
      baseKeyCount.set(baseKey, duplicateIndex + 1);

      let key = duplicateIndex === 0 ? baseKey : `${tableKey}_${baseKey}`;
      let suffix = 2;

      while (usedKeys.has(key)) {
        key = `${tableKey}_${baseKey}_${suffix}`;
        suffix += 1;
      }

      usedKeys.add(key);

      rowVariableById.set(row.id, {
        key,
        label: duplicateIndex === 0 ? cleanLabel || key : `${cleanLabel || key} · ${table.name}`,
        value: row.amount ?? 0,
        source: getVariableSource(table),
        color: row.color || table.accentColor,
        tableId: table.id,
        tableName: table.name,
        rowId: row.id,
      });
    });
  }

  const resolvedValues = new Map(
    Array.from(rowVariableById.values()).map((variable) => [variable.rowId as string, variable.value]),
  );

  const iterationCount = Math.max(1, rowVariableById.size);

  for (let iteration = 0; iteration < iterationCount; iteration += 1) {
    let changed = false;
    const variables = Array.from(rowVariableById.values()).map((variable) => ({
      ...variable,
      value: resolvedValues.get(variable.rowId as string) ?? 0,
    }));

    for (const table of tables) {
      for (const row of table.rows) {
        if (!row.amountExpression?.trim()) continue;

        const evaluation = evaluateNumericExpression(row.amountExpression, variables);
        if (evaluation.value === null) continue;

        const currentValue = resolvedValues.get(row.id) ?? 0;
        if (currentValue === evaluation.value) continue;

        resolvedValues.set(row.id, evaluation.value);
        changed = true;
      }
    }

    if (!changed) break;
  }

  const resolvedTables = tables.map((table) => ({
    ...table,
    rows: table.rows.map((row) => ({
      ...row,
      amount: resolvedValues.get(row.id) ?? row.amount,
    })),
  }));

  const variables = Array.from(rowVariableById.values()).map((variable) => ({
    ...variable,
    value: resolvedValues.get(variable.rowId as string) ?? variable.value,
  }));

  return { tables: resolvedTables, variables };
};
