import "./CustomFormulaBox.style.less";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
  type MouseEvent,
} from "react";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import KeyboardArrowUpRoundedIcon from "@mui/icons-material/KeyboardArrowUpRounded";
import Tooltip from "@mui/material/Tooltip";

import IconSelectorMenu from "../IconSelectorMenu/IconSelectorMenu";
import GenericPopup from "../GenericPopup/GenericPopup";
import { COLOR_PRESETS, ICON_OPTIONS } from "../IconSelectorMenu/IconSelectorMenu.db";

import type { IconId } from "../IconSelectorMenu/IconSelectorMenu.types";
import type { RegistryRow } from "../RegistryTable/RegistryTable.types";

type FormulaVariableSource = "income" | "expense" | "saving" | "formula" | "system";
type FormulaAccent = "green" | "red" | "blue" | "purple" | "orange";

type FormulaEvaluation = {
  value: number | null;
  error?: string;
};

type FormulaVariable = {
  key: string;
  label: string;
  value: number;
  source: FormulaVariableSource;
};

type FormulaPanel = {
  id: string;
  title: string;
  expression: string;
  accent: FormulaAccent;
  iconId: IconId;
  iconImageUrl?: string | null;
  color: string;
};

type EditableFormulaToken = {
  id: string;
  value: string;
  type: "variable" | "operator" | "number" | "text";
};

type CustomFormulaBoxProps = {
  incomeRows?: RegistryRow[];
  expenseRows?: RegistryRow[];
  savingRows?: RegistryRow[];
  customFormulaPanels?: FormulaPanel[];
  onChangeCustomFormulaPanels?: (panels: FormulaPanel[]) => void;
};

const defaultPanels: FormulaPanel[] = [
  {
    id: "total-income",
    title: "Total Income",
    expression: "total_income",
    accent: "green",
    iconId: "paid",
    iconImageUrl: null,
    color: COLOR_PRESETS[13] ?? "#34a853",
  },
  {
    id: "total-expenses",
    title: "Total Expenses",
    expression: "total_expenses",
    accent: "red",
    iconId: "receipt",
    iconImageUrl: null,
    color: COLOR_PRESETS[7] ?? "#ea4335",
  },
  {
    id: "balance",
    title: "Balance",
    expression: "total_income - total_expenses",
    accent: "blue",
    iconId: "bank",
    iconImageUrl: null,
    color: COLOR_PRESETS[0] ?? "#1a73e8",
  },
];

const variableAccentByIndex: Array<"green" | "blue" | "purple" | "orange"> = ["green", "blue", "purple", "orange"];
const operatorValues = new Set(["+", "-", "*", "/", "(", ")"]);

const currencyFormatter = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
});

const createId = () => crypto.randomUUID();

const normalizeFormulaKey = (value: string) => {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
};

const createVariablesFromRows = (
  rows: RegistryRow[],
  source: FormulaVariableSource,
  fallbackPrefix: string,
): FormulaVariable[] => {
  const usedKeys = new Map<string, number>();

  return rows.map((row, index) => {
    const cleanLabel = row.label?.trim() || "";
    const baseKey = normalizeFormulaKey(cleanLabel) || `${fallbackPrefix}_${index + 1}`;
    const currentCount = usedKeys.get(baseKey) ?? 0;

    usedKeys.set(baseKey, currentCount + 1);

    const key = currentCount === 0 ? baseKey : `${baseKey}_${currentCount + 1}`;

    return {
      key,
      label: cleanLabel || key,
      value: row.amount ?? 0,
      source,
    };
  });
};

const getCanonicalTokenValue = (value: string, variables: FormulaVariable[]) => {
  const normalizedValue = normalizeFormulaKey(value);

  const matchingVariable = variables.find((variable) => {
    return normalizeFormulaKey(variable.key) === normalizedValue || normalizeFormulaKey(variable.label) === normalizedValue;
  });

  return matchingVariable?.key ?? value.trim();
};

const getTokenType = (value: string, variables: FormulaVariable[]): EditableFormulaToken["type"] => {
  const variableKeys = new Set(variables.map((variable) => variable.key));

  if (variableKeys.has(value)) return "variable";
  if (operatorValues.has(value)) return "operator";
  if (/^\d+(?:[.,]\d+)?$/.test(value)) return "number";

  return "text";
};

const calculateExpression = (expression: string, variables: FormulaVariable[]): FormulaEvaluation => {
  const trimmedExpression = expression.trim();

  if (!trimmedExpression) {
    return { value: null, error: "Formula is empty." };
  }

  const valuesByKey = new Map(variables.map((variable) => [variable.key, variable.value]));
  const tokens = trimmedExpression.match(/[a-zA-Z_][a-zA-Z0-9_]*|\d+(?:[.,]\d+)?|[+\-*/()]|\S+/g) ?? [];

  let previousTokenType: EditableFormulaToken["type"] | null = null;
  let openParentheses = 0;

  for (const token of tokens) {
    const tokenType = getTokenType(token, variables);

    if (tokenType === "text") {
      return { value: null, error: `Unknown variable or invalid token: ${token}` };
    }

    if (token === "(") {
      openParentheses += 1;
    }

    if (token === ")") {
      openParentheses -= 1;

      if (openParentheses < 0) {
        return { value: null, error: "Closing parenthesis without matching opening parenthesis." };
      }
    }

    if (tokenType === "operator" && previousTokenType === "operator" && token !== "(" && token !== ")") {
      return { value: null, error: "Two operators cannot be used in a row." };
    }

    previousTokenType = tokenType;
  }

  if (openParentheses !== 0) {
    return { value: null, error: "Parentheses are not balanced." };
  }

  const lastToken = tokens[tokens.length - 1];

  if (lastToken && operatorValues.has(lastToken) && lastToken !== ")") {
    return { value: null, error: "Formula cannot end with an operator." };
  }

  const sanitizedExpression = tokens
    .map((token) => (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(token) ? String(valuesByKey.get(token)) : token))
    .join(" ");

  try {
    const value = Function(`"use strict"; return (${sanitizedExpression.replace(/,/g, ".")});`)() as number;

    if (!Number.isFinite(value)) {
      return { value: null, error: "Formula result is not a valid finite number." };
    }

    return { value };
  } catch {
    return { value: null, error: "Formula could not be calculated." };
  }
};

const expressionToEditableTokens = (expression: string, variables: FormulaVariable[]): EditableFormulaToken[] => {
  const parts = expression.match(/[a-zA-Z_][a-zA-Z0-9_]*|\d+(?:[.,]\d+)?|[+\-*/()]|\S+/g) ?? [];

  return parts.map((part) => ({
    id: createId(),
    value: part,
    type: getTokenType(part, variables),
  }));
};

const editableTokensToExpression = (tokens: EditableFormulaToken[], inputValue: string) => {
  return [...tokens.map((token) => token.value), inputValue.trim()].filter(Boolean).join(" ");
};

const getInsertIndexFromPointer = (event: MouseEvent<HTMLDivElement>, tokenElements: Array<HTMLElement | null>) => {
  const pointerX = event.clientX;

  for (let index = 0; index < tokenElements.length; index += 1) {
    const tokenElement = tokenElements[index];
    if (!tokenElement) continue;

    const rect = tokenElement.getBoundingClientRect();
    const midpoint = rect.left + rect.width / 2;

    if (pointerX < midpoint) {
      return index;
    }
  }

  return tokenElements.length;
};

const CustomFormulaBox = ({
  incomeRows = [],
  expenseRows = [],
  savingRows = [],
  customFormulaPanels,
  onChangeCustomFormulaPanels,
}: CustomFormulaBoxProps) => {
  const [internalPanels, setInternalPanels] = useState<FormulaPanel[]>(defaultPanels);
  const isControlled = customFormulaPanels !== undefined;
  const panels = isControlled ? customFormulaPanels : internalPanels;

  const setPanels = (value: FormulaPanel[] | ((currentPanels: FormulaPanel[]) => FormulaPanel[])) => {
    const nextPanels = typeof value === "function" ? value(panels) : value;

    if (isControlled) {
      onChangeCustomFormulaPanels?.(nextPanels);
      return;
    }

    setInternalPanels(nextPanels);
  };
  const [selectedPanelId, setSelectedPanelId] = useState("");
  const [draggedPanelId, setDraggedPanelId] = useState<string | null>(null);
  const [formulaTokens, setFormulaTokens] = useState<EditableFormulaToken[]>([]);
  const [formulaInputValue, setFormulaInputValue] = useState("");
  const [formulaInsertIndex, setFormulaInsertIndex] = useState<number | null>(null);
  const [formulaInputFocused, setFormulaInputFocused] = useState(false);
  const [highlightedSuggestionIndex, setHighlightedSuggestionIndex] = useState(0);
  const [iconEditorAnchor, setIconEditorAnchor] = useState<HTMLElement | null>(null);
  const [panelIdPendingDelete, setPanelIdPendingDelete] = useState<string | null>(null);

  const formulaInputRef = useRef<HTMLInputElement | null>(null);
  const formulaTokenRefs = useRef(new Map<string, HTMLButtonElement | HTMLSpanElement>());
  const cardRefs = useRef(new Map<string, HTMLButtonElement>());
  const previousCardRectsRef = useRef(new Map<string, DOMRect>());

  const variables = useMemo(() => {
    const rowVariables = [
      ...createVariablesFromRows(incomeRows, "income", "income"),
      ...createVariablesFromRows(expenseRows, "expense", "expense"),
      ...createVariablesFromRows(savingRows, "saving", "saving"),
    ];

    const totalIncome = rowVariables
      .filter((variable) => variable.source === "income")
      .reduce((total, variable) => total + variable.value, 0);

    const totalExpenses = rowVariables
      .filter((variable) => variable.source === "expense")
      .reduce((total, variable) => total + variable.value, 0);

    const totalSavings = rowVariables
      .filter((variable) => variable.source === "saving")
      .reduce((total, variable) => total + variable.value, 0);

    const systemVariables: FormulaVariable[] = [
      { key: "total_income", label: "Total Income", value: totalIncome, source: "system" },
      { key: "total_expenses", label: "Total Expenses", value: totalExpenses, source: "system" },
      { key: "total_savings", label: "Total Savings", value: totalSavings, source: "system" },
      { key: "balance", label: "Balance", value: totalIncome - totalExpenses, source: "system" },
    ];

    const formulaVariables: FormulaVariable[] = [];

    for (const panel of panels) {
      const key = normalizeFormulaKey(panel.title);
      if (!key) continue;

      formulaVariables.push({
        key,
        label: panel.title,
        value: calculateExpression(panel.expression, [...rowVariables, ...systemVariables, ...formulaVariables]).value ?? 0,
        source: "formula",
      });
    }

    return [...rowVariables, ...systemVariables, ...formulaVariables];
  }, [panels, incomeRows, expenseRows, savingRows]);

  const selectedPanel = panels.find((panel) => panel.id === selectedPanelId) ?? null;
  const panelPendingDelete = panels.find((panel) => panel.id === panelIdPendingDelete) ?? null;
  const selectedPanelEvaluation = selectedPanel ? calculateExpression(selectedPanel.expression, variables) : null;

  const selectedIconOption = useMemo(() => {
    if (!selectedPanel) return ICON_OPTIONS.find((icon) => icon.id === "other") ?? ICON_OPTIONS[0];

    return ICON_OPTIONS.find((icon) => icon.id === selectedPanel.iconId) ?? ICON_OPTIONS.find((icon) => icon.id === "other") ?? ICON_OPTIONS[0];
  }, [selectedPanel]);

  const selectedPanelAsRegistryRow = useMemo<RegistryRow | null>(() => {
    if (!selectedPanel) return null;

    return {
      id: selectedPanel.id,
      label: selectedPanel.title,
      amount: 0,
      prevAmount: null,
      note: "",
      iconId: selectedPanel.iconId,
      iconImageUrl: selectedPanel.iconImageUrl ?? null,
      color: selectedPanel.color,
      categories: [],
      recurring: false,
    };
  }, [selectedPanel]);

  const filteredVariableSuggestions = useMemo(() => {
    const query = normalizeFormulaKey(formulaInputValue);

    if (!query) return [];

    return variables
      .filter((variable) => {
        const variableKey = normalizeFormulaKey(variable.key);
        const variableLabel = normalizeFormulaKey(variable.label);

        return variableKey.includes(query) || variableLabel.includes(query);
      })
      .slice(0, 10);
  }, [formulaInputValue, variables]);

  const showVariableSuggestions = formulaInputFocused && filteredVariableSuggestions.length > 0;

  useEffect(() => {
    setHighlightedSuggestionIndex(0);
  }, [formulaInputValue]);

  useLayoutEffect(() => {
    if (previousCardRectsRef.current.size === 0) return;

    for (const panel of panels) {
      const cardElement = cardRefs.current.get(panel.id);
      const previousRect = previousCardRectsRef.current.get(panel.id);

      if (!cardElement || !previousRect) continue;

      const nextRect = cardElement.getBoundingClientRect();
      const deltaX = previousRect.left - nextRect.left;
      const deltaY = previousRect.top - nextRect.top;

      if (deltaX === 0 && deltaY === 0) continue;

      cardElement.animate(
        [{ transform: `translate(${deltaX}px, ${deltaY}px)` }, { transform: "translate(0, 0)" }],
        {
          duration: 260,
          easing: "ease-in-out",
        },
      );
    }

    previousCardRectsRef.current.clear();
  }, [panels]);

  const captureCardRects = () => {
    const nextRects = new Map<string, DOMRect>();

    cardRefs.current.forEach((element, panelId) => {
      nextRects.set(panelId, element.getBoundingClientRect());
    });

    previousCardRectsRef.current = nextRects;
  };

  const getPanelEvaluation = (panel: FormulaPanel) => calculateExpression(panel.expression, variables);

  const focusFormulaInput = () => {
    requestAnimationFrame(() => formulaInputRef.current?.focus());
  };

  const updateSelectedPanel = (updates: Partial<FormulaPanel>) => {
    if (!selectedPanel) return;

    setPanels((currentPanels) =>
      currentPanels.map((panel) => (panel.id === selectedPanel.id ? { ...panel, ...updates } : panel)),
    );
  };

  const syncFormulaExpression = (tokens: EditableFormulaToken[]) => {
    updateSelectedPanel({ expression: editableTokensToExpression(tokens, "") });
  };

  const getActiveInsertIndex = () => formulaInsertIndex ?? formulaTokens.length;

  const setInsertIndexAndFocus = (index: number) => {
    setFormulaInsertIndex(index);
    focusFormulaInput();
  };

  const insertFormulaTokens = (tokensToInsert: EditableFormulaToken[], shouldFocusInput = true) => {
    if (!selectedPanel || tokensToInsert.length === 0) return;

    const insertIndex = getActiveInsertIndex();
    const nextTokens = [...formulaTokens];

    nextTokens.splice(insertIndex, 0, ...tokensToInsert);

    setFormulaTokens(nextTokens);
    setFormulaInputValue("");
    setFormulaInsertIndex(insertIndex + tokensToInsert.length);
    setHighlightedSuggestionIndex(0);
    syncFormulaExpression(nextTokens);

    if (shouldFocusInput) {
      focusFormulaInput();
    }
  };

  const openPanelEditor = (panel: FormulaPanel) => {
    setSelectedPanelId(panel.id);
    setFormulaTokens(expressionToEditableTokens(panel.expression, variables));
    setFormulaInputValue("");
    setFormulaInsertIndex(null);
    setHighlightedSuggestionIndex(0);
  };

  const addPanel = () => {
    const nextPanel: FormulaPanel = {
      id: createId(),
      title: "New Formula",
      expression: "balance",
      accent: "green",
      iconId: "other",
      iconImageUrl: null,
      color: COLOR_PRESETS[0] ?? "#1a73e8",
    };

    captureCardRects();
    setPanels((currentPanels) => [...currentPanels, nextPanel]);
    setSelectedPanelId(nextPanel.id);
    setFormulaTokens(expressionToEditableTokens(nextPanel.expression, variables));
    setFormulaInputValue("");
    setFormulaInsertIndex(null);
    setHighlightedSuggestionIndex(0);
  };

  const addFormulaToken = (value: string, shouldFocusInput = true) => {
    if (!selectedPanel) return;

    const canonicalValue = getCanonicalTokenValue(value, variables);
    if (!canonicalValue) return;

    insertFormulaTokens(
      [
        {
          id: createId(),
          value: canonicalValue,
          type: getTokenType(canonicalValue, variables),
        },
      ],
      shouldFocusInput,
    );
  };

  const addVariableSuggestion = (variable: FormulaVariable) => {
    if (!selectedPanel) return;

    insertFormulaTokens([
      {
        id: createId(),
        value: variable.key,
        type: "variable" as const,
      },
    ]);
  };

  const removeFormulaToken = (tokenId: string) => {
    const removedIndex = formulaTokens.findIndex((token) => token.id === tokenId);
    const nextTokens = formulaTokens.filter((token) => token.id !== tokenId);

    setFormulaTokens(nextTokens);
    setFormulaInsertIndex((currentIndex) => {
      if (currentIndex === null) return null;
      if (removedIndex < 0) return currentIndex;
      if (currentIndex > removedIndex) return Math.max(0, currentIndex - 1);
      return Math.min(currentIndex, nextTokens.length);
    });
    syncFormulaExpression(nextTokens);
  };

  const handleFormulaInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (showVariableSuggestions && event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightedSuggestionIndex((currentIndex) => Math.min(currentIndex + 1, filteredVariableSuggestions.length - 1));
      return;
    }

    if (showVariableSuggestions && event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedSuggestionIndex((currentIndex) => Math.max(currentIndex - 1, 0));
      return;
    }

    if (showVariableSuggestions && event.key === "Enter") {
      event.preventDefault();
      addVariableSuggestion(filteredVariableSuggestions[highlightedSuggestionIndex]);
      return;
    }

    if (event.key === "Escape") {
      setFormulaInputFocused(false);
      return;
    }

    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();

      if (formulaInputValue.trim()) {
        addFormulaToken(formulaInputValue);
      }

      return;
    }

    if (operatorValues.has(event.key)) {
      event.preventDefault();

      const tokensToInsert: EditableFormulaToken[] = [];

      if (formulaInputValue.trim()) {
        const value = getCanonicalTokenValue(formulaInputValue, variables);

        tokensToInsert.push({
          id: createId(),
          value,
          type: getTokenType(value, variables),
        });
      }

      tokensToInsert.push({
        id: createId(),
        value: event.key,
        type: "operator",
      });

      insertFormulaTokens(tokensToInsert);
      return;
    }

    if (event.key === "Backspace" && formulaInputValue.length === 0 && formulaTokens.length > 0) {
      const insertIndex = getActiveInsertIndex();
      if (insertIndex <= 0) return;

      const nextTokens = [...formulaTokens];
      nextTokens.splice(insertIndex - 1, 1);

      setFormulaTokens(nextTokens);
      setFormulaInsertIndex(insertIndex - 1);
      syncFormulaExpression(nextTokens);
    }
  };

  const handleFormulaInputBlur = () => {
    setFormulaInputFocused(false);

    if (formulaInputValue.trim()) {
      addFormulaToken(formulaInputValue, false);
    }
  };

  const handleFormulaInputAreaMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    const tokenElements = formulaTokens.map((token) => formulaTokenRefs.current.get(token.id) ?? null);
    const nextIndex = getInsertIndexFromPointer(event, tokenElements);

    setFormulaInsertIndex(nextIndex);
    focusFormulaInput();
  };

  const requestDeletePanel = (panelId: string) => {
    if (panels.length <= 1) return;

    setPanelIdPendingDelete(panelId);
  };

  const confirmDeletePanel = () => {
    if (!panelIdPendingDelete || panels.length <= 1) return;

    const panelId = panelIdPendingDelete;

    captureCardRects();
    setPanels((currentPanels) => currentPanels.filter((panel) => panel.id !== panelId));
    setPanelIdPendingDelete(null);

    if (selectedPanelId === panelId) {
      setSelectedPanelId("");
      setIconEditorAnchor(null);
      setFormulaTokens([]);
      setFormulaInputValue("");
      setFormulaInsertIndex(null);
    }
  };

  const cancelDeletePanel = () => {
    setPanelIdPendingDelete(null);
  };

  const movePanelByStep = (panelId: string, direction: -1 | 1) => {
    captureCardRects();

    setPanels((currentPanels) => {
      const currentIndex = currentPanels.findIndex((panel) => panel.id === panelId);
      const targetIndex = currentIndex + direction;

      if (currentIndex < 0 || targetIndex < 0 || targetIndex >= currentPanels.length) {
        return currentPanels;
      }

      const nextPanels = [...currentPanels];
      const [movedPanel] = nextPanels.splice(currentIndex, 1);

      nextPanels.splice(targetIndex, 0, movedPanel);

      return nextPanels;
    });
  };

  const handleDragStart = (panelId: string) => {
    setDraggedPanelId(panelId);
  };

  const handleDragOver = (event: DragEvent<HTMLButtonElement>, targetPanelId: string) => {
    event.preventDefault();

    if (!draggedPanelId || draggedPanelId === targetPanelId) return;

    captureCardRects();

    setPanels((currentPanels) => {
      const sourceIndex = currentPanels.findIndex((panel) => panel.id === draggedPanelId);
      const targetIndex = currentPanels.findIndex((panel) => panel.id === targetPanelId);

      if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
        return currentPanels;
      }

      const nextPanels = [...currentPanels];
      const [movedPanel] = nextPanels.splice(sourceIndex, 1);

      nextPanels.splice(targetIndex, 0, movedPanel);

      return nextPanels;
    });
  };

  const handleDragEnd = () => {
    setDraggedPanelId(null);
  };

  const updatePanelIcon = (patch: Partial<RegistryRow>) => {
    updateSelectedPanel({
      ...(patch.iconId ? { iconId: patch.iconId as IconId } : {}),
      ...(patch.iconImageUrl !== undefined ? { iconImageUrl: patch.iconImageUrl } : {}),
      ...(patch.color ? { color: patch.color } : {}),
    });
  };

  const renderPanelIcon = (panel: FormulaPanel, fontSize: "small" | "medium" = "small") => {
    if (panel.iconImageUrl) {
      return <img className="bf-custom-formula-box__icon-image" src={panel.iconImageUrl} alt="" />;
    }

    const iconOption =
      ICON_OPTIONS.find((icon) => icon.id === panel.iconId) ??
      ICON_OPTIONS.find((icon) => icon.id === "other") ??
      ICON_OPTIONS[0];

    return iconOption.render({ fontSize });
  };

  const renderFormulaInput = (index: number) => {
    if (getActiveInsertIndex() !== index) return null;

    return (
      <input
        ref={formulaInputRef}
        value={formulaInputValue}
        placeholder={formulaTokens.length === 0 ? "Type a variable or number" : ""}
        onChange={(event) => {
          setFormulaInputValue(event.target.value);
        }}
        onFocus={() => setFormulaInputFocused(true)}
        onKeyDown={handleFormulaInputKeyDown}
        onBlur={handleFormulaInputBlur}
      />
    );
  };

  return (
    <section className="bf-custom-formula-box">
      <div className="bf-custom-formula-box__toolbar">
        <div>
          <p className="bf-custom-formula-box__eyebrow">Custom panels</p>
          <h2 className="bf-custom-formula-box__title">Formula dashboard</h2>
        </div>
      </div>

      <div className="bf-custom-formula-box__cards">
        {panels.map((panel, panelIndex) => {
          const isFirstPanel = panelIndex === 0;
          const isLastPanel = panelIndex === panels.length - 1;
          const evaluation = getPanelEvaluation(panel);

          return (
            <button
              key={panel.id}
              ref={(element) => {
                if (element) {
                  cardRefs.current.set(panel.id, element);
                } else {
                  cardRefs.current.delete(panel.id);
                }
              }}
              type="button"
              draggable
              className={`bf-custom-formula-box__card bf-custom-formula-box__card--${panel.accent} ${draggedPanelId === panel.id ? "bf-custom-formula-box__card--dragging" : ""
                }`}
              onClick={() => openPanelEditor(panel)}
              onDragStart={() => handleDragStart(panel.id)}
              onDragOver={(event) => handleDragOver(event, panel.id)}
              onDragEnd={handleDragEnd}
            >
              <span className="bf-custom-formula-box__card-drag-pill" aria-hidden="true" />
              {panels.length > 1 ? (
                <span
                  role="button"
                  tabIndex={0}
                  className="bf-custom-formula-box__card-delete-button"
                  onClick={(event) => {
                    event.stopPropagation();
                    requestDeletePanel(panel.id);
                  }}
                  onMouseDown={(event) => event.stopPropagation()}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ") return;

                    event.preventDefault();
                    event.stopPropagation();
                    requestDeletePanel(panel.id);
                  }}
                >
                  <DeleteOutlineRoundedIcon fontSize="small" />
                </span>
              ) : null}

              <span className="bf-custom-formula-box__mobile-order-controls" aria-label={`${panel.title} order controls`}>
                <span
                  role="button"
                  tabIndex={0}
                  className={`bf-custom-formula-box__mobile-order-button ${isFirstPanel ? "bf-custom-formula-box__mobile-order-button--disabled" : ""
                    }`}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (!isFirstPanel) movePanelByStep(panel.id, -1);
                  }}
                >
                  <KeyboardArrowUpRoundedIcon fontSize="small" />
                </span>

                <span
                  role="button"
                  tabIndex={0}
                  className={`bf-custom-formula-box__mobile-order-button ${isLastPanel ? "bf-custom-formula-box__mobile-order-button--disabled" : ""
                    }`}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (!isLastPanel) movePanelByStep(panel.id, 1);
                  }}
                >
                  <KeyboardArrowDownRoundedIcon fontSize="small" />
                </span>
              </span>

              <span
                className="bf-custom-formula-box__card-icon"
                style={{
                  color: panel.color,
                  background: `color-mix(in srgb, ${panel.color} 14%, transparent)`,
                }}
              >
                {renderPanelIcon(panel)}
              </span>

              <span className="bf-custom-formula-box__card-content">
                <span className="bf-custom-formula-box__card-title">{panel.title}</span>
                <strong className="bf-custom-formula-box__card-value">
                  {evaluation.value === null ? "Invalid" : currencyFormatter.format(evaluation.value)}
                </strong>
              </span>
            </button>
          );
        })}
        <button type="button" className="bf-custom-formula-box__empty-card" onClick={addPanel}>
          <span className="bf-custom-formula-box__empty-card-icon">
            <AddRoundedIcon fontSize="large" />
          </span>
          <span>Add formula</span>
        </button>
      </div>

      <GenericPopup
        open={Boolean(panelPendingDelete)}
        title="Delete formula?"
        description={`This will permanently delete ${panelPendingDelete?.title ?? "this formula"}.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={confirmDeletePanel}
        onCancel={cancelDeletePanel}
      />

      {selectedPanel ? (
        <div
          className="bf-custom-formula-box__overlay"
          role="presentation"
          onMouseDown={() => {
            if (iconEditorAnchor) return;
            setSelectedPanelId("");
          }}
        >
          <aside className="bf-custom-formula-box__editor" onMouseDown={(event) => event.stopPropagation()}>
            <div className="bf-custom-formula-box__editor-header">
              <div>
                <p className="bf-custom-formula-box__eyebrow">Edit card</p>
                <h3>{selectedPanel.title}</h3>
              </div>

              <button type="button" className="bf-custom-formula-box__icon-button" onClick={() => setSelectedPanelId("")}>
                <CloseRoundedIcon fontSize="small" />
              </button>
            </div>

            <div className="bf-custom-formula-box__name-row">
              <label className="bf-custom-formula-box__field bf-custom-formula-box__icon-field">
                <span>Icon</span>

                <button
                  type="button"
                  className="bf-custom-formula-box__selected-icon"
                  style={{
                    color: selectedPanel.color,
                    background: `color-mix(in srgb, ${selectedPanel.color} 14%, transparent)`,
                    borderColor: `color-mix(in srgb, ${selectedPanel.color} 35%, var(--bf-border))`,
                  }}
                  onMouseDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation();
                    setIconEditorAnchor(event.currentTarget);
                  }}
                >
                  {selectedPanel.iconImageUrl ? (
                    <img className="bf-custom-formula-box__selected-icon-image" src={selectedPanel.iconImageUrl} alt="" />
                  ) : (
                    selectedIconOption.render({ fontSize: "medium" })
                  )}
                </button>
              </label>

              <label className="bf-custom-formula-box__field bf-custom-formula-box__name-field">
                <span>Name</span>
                <input value={selectedPanel.title} onChange={(event) => updateSelectedPanel({ title: event.target.value })} />
              </label>
            </div>

            <label className="bf-custom-formula-box__field bf-custom-formula-box__formula-field">
              <span>Formula</span>

              <div
                className="bf-custom-formula-box__formula-input"
                onMouseDown={handleFormulaInputAreaMouseDown}
                onClick={focusFormulaInput}
              >
                {formulaTokens.map((token, tokenIndex) => {
                  const matchingVariable = variables.find((variable) => variable.key === token.value);
                  const tokenAccent = token.type === "variable" ? variableAccentByIndex[tokenIndex % variableAccentByIndex.length] : undefined;

                  if (token.type !== "variable") {
                    return (
                      <span key={token.id} className="bf-custom-formula-box__formula-token-wrap">
                        {renderFormulaInput(tokenIndex)}

                        <span
                          ref={(element) => {
                            if (element) {
                              formulaTokenRefs.current.set(token.id, element);
                            } else {
                              formulaTokenRefs.current.delete(token.id);
                            }
                          }}
                          className="bf-custom-formula-box__formula-plain-token"
                        >
                          {token.value}
                        </span>
                      </span>
                    );
                  }

                  return (
                    <span key={token.id} className="bf-custom-formula-box__formula-token-wrap">
                      {renderFormulaInput(tokenIndex)}

                      <Tooltip
                        title={matchingVariable ? `${matchingVariable.label}: ${currencyFormatter.format(matchingVariable.value)}` : ""}
                        disableHoverListener={!matchingVariable}
                        arrow
                      >
                        <button
                          ref={(element) => {
                            if (element) {
                              formulaTokenRefs.current.set(token.id, element);
                            } else {
                              formulaTokenRefs.current.delete(token.id);
                            }
                          }}
                          type="button"
                          className={`bf-custom-formula-box__formula-token ${tokenAccent ? `bf-custom-formula-box__formula-token--${tokenAccent}` : ""
                            }`}
                          onClick={(event) => event.stopPropagation()}
                        >
                          <span className="bf-custom-formula-box__formula-token-text">{token.value}</span>

                          <span
                            role="button"
                            tabIndex={0}
                            className="bf-custom-formula-box__formula-token-remove"
                            onMouseDown={(event) => event.stopPropagation()}
                            onClick={(event) => {
                              event.stopPropagation();
                              removeFormulaToken(token.id);
                            }}
                          >
                            ×
                          </span>
                        </button>
                      </Tooltip>
                    </span>
                  );
                })}

                {renderFormulaInput(formulaTokens.length)}
              </div>

              {showVariableSuggestions ? (
                <div className="bf-custom-formula-box__suggestions">
                  {filteredVariableSuggestions.map((variable, variableIndex) => (
                    <button
                      key={`${variable.source}-${variable.key}`}
                      type="button"
                      className={`bf-custom-formula-box__suggestion ${highlightedSuggestionIndex === variableIndex ? "bf-custom-formula-box__suggestion--active" : ""
                        }`}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        addVariableSuggestion(variable);
                      }}
                    >
                      <span className="bf-custom-formula-box__suggestion-info">
                        <strong>{variable.label}</strong>
                        <small>{variable.key}</small>
                      </span>

                      <span className="bf-custom-formula-box__suggestion-value">
                        {currencyFormatter.format(variable.value)}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </label>

            <Tooltip title={selectedPanelEvaluation?.error ?? ""} disableHoverListener={!selectedPanelEvaluation?.error} arrow>
              <div
                className={`bf-custom-formula-box__result-preview ${selectedPanelEvaluation?.error ? "bf-custom-formula-box__result-preview--invalid" : ""
                  }`}
              >
                <span>Result</span>
                <strong>{selectedPanelEvaluation?.value === null ? "Invalid" : currencyFormatter.format(selectedPanelEvaluation?.value ?? 0)}</strong>
              </div>
            </Tooltip>

          </aside>

          <IconSelectorMenu
            open={Boolean(iconEditorAnchor)}
            anchorEl={iconEditorAnchor}
            onClose={() => setIconEditorAnchor(null)}
            row={selectedPanelAsRegistryRow}
            categories={[]}
            onCreateCategory={() => undefined}
            icons={ICON_OPTIONS}
            colorPresets={COLOR_PRESETS}
            onChange={updatePanelIcon}
            title="Customize card icon"
            showCategories={false}
            allowCustomImages
            closeOnClickAway={false}
          />
        </div>
      ) : null}
    </section>
  );
};

export default CustomFormulaBox;