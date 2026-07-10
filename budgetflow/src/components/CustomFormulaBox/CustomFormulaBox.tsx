import "./CustomFormulaBox.style.less";

import { useLayoutEffect, useMemo, useRef, useState, type DragEvent } from "react";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import KeyboardArrowUpRoundedIcon from "@mui/icons-material/KeyboardArrowUpRounded";
import Tooltip from "@mui/material/Tooltip";

import AdvancedFormulaTool from "../AdvancedFormulaTool/AdvancedFormulaTool";
import GenericPopup from "../GenericPopup/GenericPopup";
import IconSelectorMenu from "../IconSelectorMenu/IconSelectorMenu";
import { COLOR_PRESETS, ICON_OPTIONS } from "../IconSelectorMenu/IconSelectorMenu.db";

import type { IconId } from "../IconSelectorMenu/IconSelectorMenu.types";
import type { RegistryRow } from "../RegistryTable/RegistryTable.types";
import type { CustomFormulaPanel } from "../../pages/DashboardPage/DashboardPage.types";
import type { FormulaVariable, FormulaVariableSource } from "../VariablesViewer/VariablesViewer";

type FormulaEvaluation = {
  value: number | null;
  error?: string;
};

type CustomFormulaBoxProps = {
  incomeRows?: RegistryRow[];
  expenseRows?: RegistryRow[];
  savingRows?: RegistryRow[];
  customFormulaPanels?: CustomFormulaPanel[];
  onChangeCustomFormulaPanels?: (panels: CustomFormulaPanel[]) => void;
};

const defaultPanels: CustomFormulaPanel[] = [
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

const operatorValues = new Set(["+", "-", "*", "/", "(", ")"]);

const createId = () => crypto.randomUUID();

const formatCurrencyValue = (value: number) => {
  const normalizedValue = Number.parseFloat(value.toFixed(10));
  const hasDecimals = !Number.isInteger(normalizedValue);

  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 10,
  }).format(normalizedValue);
};

const normalizeFormulaKey = (value: string) => {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
};

const normalizeFormulaNumber = (value: number) => {
  return Number.parseFloat(value.toFixed(10));
};

const getTokenType = (value: string, variables: FormulaVariable[]) => {
  const variableKeys = new Set(variables.map((variable) => variable.key));

  if (variableKeys.has(value)) return "variable";
  if (operatorValues.has(value)) return "operator";
  if (/^\d+(?:[.,]\d+)?$/.test(value)) return "number";

  return "text";
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
      color: row.color,
    };
  });
};

const calculateExpression = (expression: string, variables: FormulaVariable[]): FormulaEvaluation => {
  const trimmedExpression = expression.trim();

  if (!trimmedExpression) {
    return { value: null, error: "Formula is empty." };
  }

  const valuesByKey = new Map(variables.map((variable) => [variable.key, variable.value]));
  const tokens = trimmedExpression.match(/[a-zA-Z_][a-zA-Z0-9_]*|\d+(?:[.,]\d+)?|[+\-*/()]|\S+/g) ?? [];

  let previousTokenType: string | null = null;
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

    return { value: normalizeFormulaNumber(value) };
  } catch {
    return { value: null, error: "Formula could not be calculated." };
  }
};

const CustomFormulaBox = ({
  incomeRows = [],
  expenseRows = [],
  savingRows = [],
  customFormulaPanels,
  onChangeCustomFormulaPanels,
}: CustomFormulaBoxProps) => {
  const [internalPanels, setInternalPanels] = useState<CustomFormulaPanel[]>(defaultPanels);
  const [selectedPanelId, setSelectedPanelId] = useState("");
  const [draggedPanelId, setDraggedPanelId] = useState<string | null>(null);
  const [iconEditorAnchor, setIconEditorAnchor] = useState<HTMLElement | null>(null);
  const [panelIdPendingDelete, setPanelIdPendingDelete] = useState<string | null>(null);

  const cardRefs = useRef(new Map<string, HTMLButtonElement>());
  const previousCardRectsRef = useRef(new Map<string, DOMRect>());

  const isControlled = customFormulaPanels !== undefined;
  const panels = isControlled ? customFormulaPanels : internalPanels;

  const setPanels = (value: CustomFormulaPanel[] | ((currentPanels: CustomFormulaPanel[]) => CustomFormulaPanel[])) => {
    const nextPanels = typeof value === "function" ? value(panels) : value;

    if (isControlled) {
      onChangeCustomFormulaPanels?.(nextPanels);
      return;
    }

    setInternalPanels(nextPanels);
  };

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
      {
        key: "total_income",
        label: "Total Income",
        value: totalIncome,
        source: "system",
        color: COLOR_PRESETS[13] ?? "#34a853",
      },
      {
        key: "total_expenses",
        label: "Total Expenses",
        value: totalExpenses,
        source: "system",
        color: COLOR_PRESETS[7] ?? "#ea4335",
      },
      {
        key: "total_savings",
        label: "Total Savings",
        value: totalSavings,
        source: "system",
        color: COLOR_PRESETS[0] ?? "#1a73e8",
      },
      {
        key: "balance",
        label: "Balance",
        value: totalIncome - totalExpenses,
        source: "system",
        color: COLOR_PRESETS[0] ?? "#1a73e8",
      },
    ];

    const formulaVariables: FormulaVariable[] = [];
    const reservedVariableKeys = new Set([...rowVariables, ...systemVariables].map((variable) => variable.key));

    for (const panel of panels) {
      const key = normalizeFormulaKey(panel.title);
      if (!key || reservedVariableKeys.has(key)) continue;

      formulaVariables.push({
        key,
        label: panel.title,
        value: calculateExpression(panel.expression, [...rowVariables, ...systemVariables, ...formulaVariables]).value ?? 0,
        source: "formula",
        color: panel.color,
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

  const getPanelEvaluation = (panel: CustomFormulaPanel) => calculateExpression(panel.expression, variables);

  const openPanelEditor = (panel: CustomFormulaPanel) => {
    setSelectedPanelId(panel.id);
  };

  const closeEditor = () => {
    setSelectedPanelId("");
    setIconEditorAnchor(null);
  };

  const updateSelectedPanel = (updates: Partial<CustomFormulaPanel>) => {
    if (!selectedPanel) return;

    setPanels((currentPanels) =>
      currentPanels.map((panel) => (panel.id === selectedPanel.id ? { ...panel, ...updates } : panel)),
    );
  };

  const addPanel = () => {
    const nextPanel: CustomFormulaPanel = {
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
      closeEditor();
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

  const renderPanelIcon = (panel: CustomFormulaPanel, fontSize: "small" | "medium" = "small") => {
    if (panel.iconImageUrl) {
      return <img className="cfb-card__icon-image" src={panel.iconImageUrl} alt="" />;
    }

    const iconOption =
      ICON_OPTIONS.find((icon) => icon.id === panel.iconId) ??
      ICON_OPTIONS.find((icon) => icon.id === "other") ??
      ICON_OPTIONS[0];

    return iconOption.render({ fontSize });
  };

  return (
    <main id="custom-formula-box">
      <div id="cfb__toolbar">
        <p id="cfb__eyebrow">Custom panels</p>
        <h2 id="cfb__title">Formula dashboard</h2>
      </div>

      <div id="custom-formula-box__cards">
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
              className={`bf-bubble-surface cfb-card cfb-card--${panel.accent} ${draggedPanelId === panel.id ? "cfb-card--dragging" : ""}`}
              onClick={() => openPanelEditor(panel)}
              onDragStart={() => handleDragStart(panel.id)}
              onDragOver={(event) => handleDragOver(event, panel.id)}
              onDragEnd={handleDragEnd}
            >
              <span className="cfb-card__drag-pill" aria-hidden="true" />

              {panels.length > 1 ? (
                <span
                  role="button"
                  tabIndex={0}
                  className="bf-delete-icon bf-delete-icon--floating cfb-card__delete-button"
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

              <span className="cfb-card__mobile-order-controls" aria-label={`${panel.title} order controls`}>
                <span
                  role="button"
                  tabIndex={0}
                  className={`cfb-card__mobile-order-button ${
                    isFirstPanel ? "cfb-card__mobile-order-button--disabled" : ""
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
                  className={`cfb-card__mobile-order-button ${
                    isLastPanel ? "cfb-card__mobile-order-button--disabled" : ""
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
                className="cfb-card__icon"
                style={{
                  color: panel.color,
                  background: `color-mix(in srgb, ${panel.color} 14%, transparent)`,
                }}
              >
                {renderPanelIcon(panel)}
              </span>

              <span className="cfb-card__content">
                <span className="cfb-card__title">{panel.title}</span>
                <strong className="cfb-card__value">
                  {evaluation.value === null ? "Invalid" : formatCurrencyValue(evaluation.value)}
                </strong>
              </span>
            </button>
          );
        })}

        <button type="button" id="cfb__empty_card" onClick={addPanel}>
          <span id="cfb__empty_card_icon">
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
          id="cfb__overlay"
          role="presentation"
          onMouseDown={() => {
            if (iconEditorAnchor) return;
            closeEditor();
          }}
        >
          <aside id="cfb__editor" onMouseDown={(event) => event.stopPropagation()}>
            <div id="cfb__editor_header">
              <div>
                <p id="cfb__editor_eyebrow">Edit card</p>
                <h3 id="cfb__editor_title">{selectedPanel.title}</h3>
              </div>

              <button type="button" id="cfb__editor_close_button" onClick={closeEditor}>
                <CloseRoundedIcon fontSize="small" />
              </button>
            </div>

            <div id="cfb__editor_name_row">
              <label className="cfb-field cfb-field--icon">
                <span className="cfb-field__label">Icon</span>

                <button
                  type="button"
                  id="cfb__selected_icon_button"
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
                    <img id="cfb__selected_icon_image" src={selectedPanel.iconImageUrl} alt="" />
                  ) : (
                    selectedIconOption.render({ fontSize: "medium" })
                  )}
                </button>
              </label>

              <label className="cfb-field cfb-field--name">
                <span className="cfb-field__label">Name</span>
                <input value={selectedPanel.title} onChange={(event) => updateSelectedPanel({ title: event.target.value })} />
              </label>
            </div>

            <AdvancedFormulaTool
              expression={selectedPanel.expression}
              variables={variables}
              result={selectedPanelEvaluation}
              formatValue={formatCurrencyValue}
              onChangeExpression={(expression) => updateSelectedPanel({ expression })}
            />

            <Tooltip title={selectedPanelEvaluation?.error ?? ""} disableHoverListener={!selectedPanelEvaluation?.error} arrow>
              <div
                id="cfb__result_preview"
                className={`bf-preview ${selectedPanelEvaluation?.error ? "bf-preview--invalid" : ""}`}
              >
                <span id="cfb__result_label" className="bf-preview__label">
                  Result
                </span>

                <strong id="cfb__result_value" className="bf-preview__value">
                  {selectedPanelEvaluation?.value === null ? "Invalid" : formatCurrencyValue(selectedPanelEvaluation?.value ?? 0)}
                </strong>
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
    </main>
  );
};

export default CustomFormulaBox;