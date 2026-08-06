import "./VariablesViewer.styles.less";

import { useMemo, useState } from "react";

import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import InputAdornment from "@mui/material/InputAdornment";

import GenericInput from "../GenericInput/GenericInput";
import { useLanguage } from "../../localization/useLanguage";

export type FormulaVariableSource = "income" | "expense" | "saving" | "table" | "formula" | "system";

export type FormulaVariable = {
  key: string;
  label: string;
  value: number;
  source: FormulaVariableSource;
  color?: string | null;
  tableId?: string;
  tableName?: string;
  rowId?: string;
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
  title,
  description,
  showSearch = true,
}: VariablesViewerProps) => {
  const { activeLanguage } = useLanguage();
  const dictionary = activeLanguage.dictionary;
  const resolvedTitle = title ?? dictionary.variables.title;
  const resolvedDescription = description ?? dictionary.variables.description;
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
          <h3>{resolvedTitle}</h3>
          <p>{resolvedDescription}</p>
        </div>
      </header>

      {showSearch ? (
        <GenericInput
          value={searchValue}
          placeholder={dictionary.variables.search}
          onChange={(event) => setSearchValue(event.target.value)}
          size="small"
          fullWidth
          className="bf-variables-viewer__search"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchRoundedIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
      ) : null}

      <div className="bf-variables-viewer__summary">
        <span>{filteredVariables.length} {dictionary.variables.variables}</span>
        <span>{usedVariableKeys.size} {dictionary.variables.used}</span>
      </div>

      <div className="bf-variables-viewer__list">
        {filteredVariables.length === 0 ? <div className="bf-variables-viewer__empty">{dictionary.variables.noneFound}</div> : null}

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
                <small>{dictionary.variables.sources[variable.source]}</small>
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
