import "./VariablesViewer.styles.less";

import { useMemo, useState } from "react";

import SearchRoundedIcon from "@mui/icons-material/SearchRounded";

export type FormulaVariableSource = "income" | "expense" | "saving" | "formula" | "system";

export type FormulaVariable = {
  key: string;
  label: string;
  value: number;
  source: FormulaVariableSource;
  color?: string | null;
};

type VariablesViewerProps = {
  variables: FormulaVariable[];
  usedVariableKeys?: Set<string>;
  formatValue: (value: number) => string;
  title?: string;
  description?: string;
  showSearch?: boolean;
};

const normalizeVariableSearch = (value: string) => {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
};

export const getVariableDisplayLabel = (variable: FormulaVariable) => {
  return variable.label.trim() || variable.key;
};

const VariablesViewer = ({
  variables,
  usedVariableKeys = new Set<string>(),
  formatValue,
  title = "Variables",
  description = "Available variables for the current period.",
  showSearch = true,
}: VariablesViewerProps) => {
  const [searchValue, setSearchValue] = useState("");

  const filteredVariables = useMemo(() => {
    const query = normalizeVariableSearch(searchValue);

    if (!query) return variables;

    return variables.filter((variable) => {
      const variableKey = normalizeVariableSearch(variable.key);
      const variableLabel = normalizeVariableSearch(variable.label);

      return variableKey.includes(query) || variableLabel.includes(query);
    });
  }, [variables, searchValue]);

  return (
    <section className="bf-variables-viewer">
      <header className="bf-variables-viewer__header">
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </header>

      {showSearch ? (
        <label className="bf-variables-viewer__search">
          <SearchRoundedIcon fontSize="small" />
          <input value={searchValue} placeholder="Search variables" onChange={(event) => setSearchValue(event.target.value)} />
        </label>
      ) : null}

      <div className="bf-variables-viewer__summary">
        <span>{filteredVariables.length} variables</span>
        <span>{usedVariableKeys.size} used</span>
      </div>

      <div className="bf-variables-viewer__list">
        {filteredVariables.length === 0 ? <div className="bf-variables-viewer__empty">No variables found.</div> : null}

        {filteredVariables.map((variable) => {
          const isUsed = usedVariableKeys.has(variable.key);

          return (
            <div
              key={`${variable.source}-${variable.key}`}
              className={`bf-variables-viewer__row ${isUsed ? "bf-variables-viewer__row--used" : ""}`}
              style={
                variable.color
                  ? ({
                      "--bf-variable-color": variable.color,
                    } as React.CSSProperties)
                  : undefined
              }
            >
              <span className="bf-variables-viewer__row-info">
                <strong>{getVariableDisplayLabel(variable)}</strong>
                <small>{variable.key}</small>
              </span>

              <span className="bf-variables-viewer__row-meta">
                <small>{variable.source}</small>
                <strong>{formatValue(variable.value)}</strong>
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default VariablesViewer;