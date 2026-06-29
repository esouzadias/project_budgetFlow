import "./AdvancedFormulaTool.styles.less";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";

import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import Tooltip from "@mui/material/Tooltip";

import { getVariableDisplayLabel, type FormulaVariable } from "../VariablesViewer/VariablesViewer";

export type FormulaEvaluation = {
  value: number | null;
  error?: string;
};

export type EditableFormulaToken = {
  id: string;
  value: string;
  type: "variable" | "operator" | "number" | "text";
};

type AdvancedFormulaToolProps = {
  expression: string;
  variables: FormulaVariable[];
  result: FormulaEvaluation | null;
  formatValue: (value: number) => string;
  onChangeExpression: (expression: string) => void;
};

const variableAccentByIndex: Array<"green" | "blue" | "purple" | "orange"> = ["green", "blue", "purple", "orange"];
const operatorValues = new Set(["+", "-", "*", "/", "(", ")"]);

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

const isOperatorToken = (token?: EditableFormulaToken | null) => {
  return Boolean(token && token.type === "operator" && operatorValues.has(token.value));
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

const cleanupTokensAfterRemoval = (
  tokens: EditableFormulaToken[],
  removedIndex: number,
  removedToken: EditableFormulaToken,
) => {
  if (removedToken.type !== "variable" && removedToken.type !== "number") return tokens;

  const nextTokens = [...tokens];
  const previousToken = nextTokens[removedIndex - 1] ?? null;
  const nextToken = nextTokens[removedIndex] ?? null;
  const tokenBeforePrevious = nextTokens[removedIndex - 2] ?? null;

  if (
    isOperatorToken(previousToken) &&
    (!tokenBeforePrevious || isOperatorToken(tokenBeforePrevious) || !nextToken || isOperatorToken(nextToken))
  ) {
    nextTokens.splice(removedIndex - 1, 1);
    return nextTokens;
  }

  if (isOperatorToken(nextToken) && (!previousToken || isOperatorToken(previousToken))) {
    nextTokens.splice(removedIndex, 1);
    return nextTokens;
  }

  return nextTokens;
};

const getInsertIndexFromClientX = (clientX: number, tokenElements: Array<HTMLElement | null>) => {
  for (let index = 0; index < tokenElements.length; index += 1) {
    const tokenElement = tokenElements[index];
    if (!tokenElement) continue;

    const rect = tokenElement.getBoundingClientRect();
    const midpoint = rect.left + rect.width / 2;

    if (clientX < midpoint) {
      return index;
    }
  }

  return tokenElements.length;
};

const AdvancedFormulaTool = ({
  expression,
  variables,
  formatValue,
  onChangeExpression,
}: AdvancedFormulaToolProps) => {
  const [tokens, setTokens] = useState<EditableFormulaToken[]>(() => expressionToEditableTokens(expression, variables));
  const [inputValue, setInputValue] = useState("");
  const [insertIndex, setInsertIndex] = useState<number | null>(null);
  const [inputFocused, setInputFocused] = useState(false);
  const [highlightedSuggestionIndex, setHighlightedSuggestionIndex] = useState(0);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [highlightedSearchIndex, setHighlightedSearchIndex] = useState(0);

  const [recentVariableKeys, setRecentVariableKeys] = useState<string[]>([]);
  const [draggedVariableKey, setDraggedVariableKey] = useState<string | null>(null);
  const [dropPreviewIndex, setDropPreviewIndex] = useState<number | null>(null);
  const [lastInsertedTokenId, setLastInsertedTokenId] = useState<string | null>(null);

  const lastExpressionRef = useRef(expression);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const searchPanelRef = useRef<HTMLLabelElement | null>(null);
  const searchButtonRef = useRef<HTMLButtonElement | null>(null);
  const tokenRefs = useRef(new Map<string, HTMLButtonElement | HTMLSpanElement>());
  const previousTokenRectsRef = useRef(new Map<string, DOMRect>());

  const usedQuickVariables = useMemo(() => {
    const frequency = new Map<string, number>();

    for (const token of tokens) {
      if (token.type !== "variable") continue;
      frequency.set(token.value, (frequency.get(token.value) ?? 0) + 1);
    }

    return variables
      .filter((variable) => frequency.has(variable.key))
      .sort((a, b) => (frequency.get(b.key) ?? 0) - (frequency.get(a.key) ?? 0));
  }, [tokens, variables]);

  const remainingQuickVariables = useMemo(() => {
    const usedKeys = new Set(usedQuickVariables.map((variable) => variable.key));

    const recentVariables = recentVariableKeys
      .map((key) => variables.find((variable) => variable.key === key) ?? null)
      .filter((variable): variable is FormulaVariable => Boolean(variable))
      .filter((variable) => !usedKeys.has(variable.key));

    const recentKeys = new Set(recentVariables.map((variable) => variable.key));

    const unusedVariables = variables.filter((variable) => !usedKeys.has(variable.key) && !recentKeys.has(variable.key));

    return [...recentVariables, ...unusedVariables];
  }, [variables, usedQuickVariables, recentVariableKeys]);

  const searchedVariables = useMemo(() => {
    const query = normalizeFormulaKey(searchValue);

    if (!query) return variables;

    return variables.filter((variable) => {
      const variableKey = normalizeFormulaKey(variable.key);
      const variableLabel = normalizeFormulaKey(variable.label);

      return variableKey.includes(query) || variableLabel.includes(query);
    });
  }, [searchValue, variables]);

  const filteredVariableSuggestions = useMemo(() => {
    const query = normalizeFormulaKey(inputValue);

    if (!query) return [];

    return variables
      .filter((variable) => {
        const variableKey = normalizeFormulaKey(variable.key);
        const variableLabel = normalizeFormulaKey(variable.label);

        return variableKey.includes(query) || variableLabel.includes(query);
      })
      .slice(0, 10);
  }, [inputValue, variables]);

  const searchAutocompleteSuggestions = useMemo(() => {
    const query = normalizeFormulaKey(searchValue);

    if (!query) return [];

    return searchedVariables.slice(0, 10);
  }, [searchValue, searchedVariables]);

  const showVariableSuggestions = inputFocused && filteredVariableSuggestions.length > 0;
  const showSearchAutocomplete = searchOpen && searchFocused && searchAutocompleteSuggestions.length > 0;
  const hasSearchQuery = searchOpen && searchValue.trim().length > 0;

  useEffect(() => {
    if (!searchOpen) return;

    const closeSearch = () => {
      setSearchOpen(false);
      setSearchValue("");
      setSearchFocused(false);
      setHighlightedSearchIndex(0);
    };

    const handleDocumentPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;

      if (!target) return;
      if (searchPanelRef.current?.contains(target)) return;
      if (searchButtonRef.current?.contains(target)) return;

      closeSearch();
    };

    document.addEventListener("pointerdown", handleDocumentPointerDown, true);

    return () => {
      document.removeEventListener("pointerdown", handleDocumentPointerDown, true);
    };
  }, [searchOpen]);

  useEffect(() => {
    if (!searchOpen) return;

    requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
  }, [searchOpen]);

  useEffect(() => {
    if (expression === lastExpressionRef.current) return;

    setTokens(expressionToEditableTokens(expression, variables));
    setInputValue("");
    setInsertIndex(null);
    lastExpressionRef.current = expression;
  }, [expression, variables]);

  useEffect(() => {
    setHighlightedSuggestionIndex(0);
  }, [inputValue]);

  useEffect(() => {
    setHighlightedSearchIndex(0);
  }, [searchValue]);

  useLayoutEffect(() => {
    if (previousTokenRectsRef.current.size === 0) return;

    for (const token of tokens) {
      const tokenElement = tokenRefs.current.get(token.id);
      const previousRect = previousTokenRectsRef.current.get(token.id);

      if (!tokenElement || !previousRect) continue;

      const nextRect = tokenElement.getBoundingClientRect();
      const deltaX = previousRect.left - nextRect.left;
      const deltaY = previousRect.top - nextRect.top;

      if (deltaX === 0 && deltaY === 0) continue;

      tokenElement.animate(
        [{ transform: `translate(${deltaX}px, ${deltaY}px)` }, { transform: "translate(0, 0)" }],
        {
          duration: 220,
          easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
        },
      );
    }

    if (lastInsertedTokenId) {
      const insertedElement = tokenRefs.current.get(lastInsertedTokenId);

      insertedElement?.animate(
        [
          { opacity: 0, transform: "scale(0.82) translateY(8px)" },
          { opacity: 1, transform: "scale(1) translateY(0)" },
        ],
        {
          duration: 240,
          easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
        },
      );
    }

    previousTokenRectsRef.current.clear();
    setLastInsertedTokenId(null);
  }, [tokens, lastInsertedTokenId]);

  const captureTokenRects = () => {
    const nextRects = new Map<string, DOMRect>();

    tokenRefs.current.forEach((element, tokenId) => {
      nextRects.set(tokenId, element.getBoundingClientRect());
    });

    previousTokenRectsRef.current = nextRects;
  };

  const commitTokens = (nextTokens: EditableFormulaToken[]) => {
    const nextExpression = editableTokensToExpression(nextTokens, "");

    lastExpressionRef.current = nextExpression;
    setTokens(nextTokens);
    onChangeExpression(nextExpression);
  };

  const focusInput = () => {
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const getActiveInsertIndex = () => insertIndex ?? tokens.length;

  const updateRecentVariables = (variableKey: string) => {
    setRecentVariableKeys((currentKeys) => [variableKey, ...currentKeys.filter((key) => key !== variableKey)].slice(0, 24));
  };

  const insertFormulaTokens = (
    tokensToInsert: EditableFormulaToken[],
    options?: {
      shouldFocusInput?: boolean;
      targetIndex?: number;
    },
  ) => {
    if (tokensToInsert.length === 0) return;

    captureTokenRects();

    const shouldFocusInput = options?.shouldFocusInput ?? true;
    const activeInsertIndex = options?.targetIndex ?? getActiveInsertIndex();
    const nextTokens = [...tokens];

    nextTokens.splice(activeInsertIndex, 0, ...tokensToInsert);

    setInputValue("");
    setInsertIndex(activeInsertIndex + tokensToInsert.length);
    setHighlightedSuggestionIndex(0);
    setDropPreviewIndex(null);
    setLastInsertedTokenId(tokensToInsert[tokensToInsert.length - 1].id);
    commitTokens(nextTokens);

    if (shouldFocusInput) {
      focusInput();
    }
  };

  const addRawToken = (value: string, shouldFocusInput = true) => {
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
      { shouldFocusInput },
    );
  };

  const addVariable = (variable: FormulaVariable, targetIndex?: number) => {
    const token: EditableFormulaToken = {
      id: createId(),
      value: variable.key,
      type: "variable",
    };

    updateRecentVariables(variable.key);
    insertFormulaTokens([token], { targetIndex });
  };

  const removeFormulaToken = (tokenId: string) => {
    const removedIndex = tokens.findIndex((token) => token.id === tokenId);
    if (removedIndex < 0) return;

    captureTokenRects();

    const removedToken = tokens[removedIndex];
    const tokensWithoutRemoved = tokens.filter((token) => token.id !== tokenId);
    const nextTokens = cleanupTokensAfterRemoval(tokensWithoutRemoved, removedIndex, removedToken);

    setInsertIndex((currentIndex) => {
      if (currentIndex === null) return null;
      if (currentIndex > removedIndex) return Math.max(0, currentIndex - (tokens.length - nextTokens.length));
      return Math.min(currentIndex, nextTokens.length);
    });

    commitTokens(nextTokens);
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
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
      addVariable(filteredVariableSuggestions[highlightedSuggestionIndex]);
      return;
    }

    if (event.key === "Escape") {
      setInputFocused(false);
      return;
    }

    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();

      if (inputValue.trim()) {
        addRawToken(inputValue);
      }

      return;
    }

    if (operatorValues.has(event.key)) {
      event.preventDefault();

      const tokensToInsert: EditableFormulaToken[] = [];

      if (inputValue.trim()) {
        const value = getCanonicalTokenValue(inputValue, variables);

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

    if (event.key === "Backspace" && inputValue.length === 0 && tokens.length > 0) {
      const activeInsertIndex = getActiveInsertIndex();
      if (activeInsertIndex <= 0) return;

      captureTokenRects();

      const removedToken = tokens[activeInsertIndex - 1];
      const nextTokens = [...tokens];

      nextTokens.splice(activeInsertIndex - 1, 1);

      const cleanedTokens = cleanupTokensAfterRemoval(nextTokens, activeInsertIndex - 1, removedToken);

      setInsertIndex(Math.max(0, activeInsertIndex - (tokens.length - cleanedTokens.length)));
      commitTokens(cleanedTokens);
    }
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (showSearchAutocomplete && event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightedSearchIndex((currentIndex) => Math.min(currentIndex + 1, searchAutocompleteSuggestions.length - 1));
      return;
    }

    if (showSearchAutocomplete && event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedSearchIndex((currentIndex) => Math.max(currentIndex - 1, 0));
      return;
    }

    if (showSearchAutocomplete && event.key === "Enter") {
      event.preventDefault();
      addVariable(searchAutocompleteSuggestions[highlightedSearchIndex]);
      return;
    }

    if (event.key === "Escape") {
      setSearchOpen(false);
      setSearchValue("");
      setSearchFocused(false);
      setHighlightedSearchIndex(0);
    }
  };

  const handleInputBlur = () => {
    setInputFocused(false);

    if (inputValue.trim()) {
      addRawToken(inputValue, false);
    }
  };

  const handleFormulaInputAreaMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
    const tokenElements = tokens.map((token) => tokenRefs.current.get(token.id) ?? null);
    const nextIndex = getInsertIndexFromClientX(event.clientX, tokenElements);

    setInsertIndex(nextIndex);
    focusInput();
  };

  const handleFormulaDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();

    const tokenElements = tokens.map((token) => tokenRefs.current.get(token.id) ?? null);
    const nextIndex = getInsertIndexFromClientX(event.clientX, tokenElements);

    setDropPreviewIndex(nextIndex);
    setInsertIndex(nextIndex);
  };

  const handleFormulaDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();

    const variableKey = event.dataTransfer.getData("application/budgetflow-variable-key");
    const variable = variables.find((item) => item.key === variableKey);

    setDraggedVariableKey(null);

    if (!variable) {
      setDropPreviewIndex(null);
      return;
    }

    addVariable(variable, dropPreviewIndex ?? getActiveInsertIndex());
  };

  const handleDragEnd = () => {
    setDraggedVariableKey(null);
    setDropPreviewIndex(null);
  };

  const renderInput = (index: number) => {
    if (getActiveInsertIndex() !== index) return null;

    return (
      <input
        ref={inputRef}
        value={inputValue}
        placeholder={tokens.length === 0 ? "Type a variable or number" : ""}
        onChange={(event) => setInputValue(event.target.value)}
        onFocus={() => setInputFocused(true)}
        onKeyDown={handleInputKeyDown}
        onBlur={handleInputBlur}
      />
    );
  };

  const renderDropPreview = (index: number) => {
    if (dropPreviewIndex !== index) return null;

    return (
      <span className="bf-advanced-formula-tool__drop-preview">
        <span />
      </span>
    );
  };

  const renderVariableChip = (variable: FormulaVariable) => {
    const isDragging = draggedVariableKey === variable.key;

    return (
      <button
        key={`${variable.source}-${variable.key}`}
        type="button"
        draggable
        className={`bf-advanced-formula-tool__quick-variable ${isDragging ? "bf-advanced-formula-tool__quick-variable--dragging" : ""
          }`}
        style={
          variable.color
            ? ({
              "--bf-variable-color": variable.color,
            } as CSSProperties)
            : undefined
        }
        onDragStart={(event) => {
          setDraggedVariableKey(variable.key);
          event.dataTransfer.setData("application/budgetflow-variable-key", variable.key);
          event.dataTransfer.effectAllowed = "copy";
        }}
        onDragEnd={handleDragEnd}
        onClick={() => addVariable(variable)}
      >
        <span>{getVariableDisplayLabel(variable)}</span>
        <small>{formatValue(variable.value)}</small>
      </button>
    );
  };

  return (
    <section className="bf-advanced-formula-tool">
      <div className="bf-advanced-formula-tool__label-row">
        <span>Formula</span>
      </div>

      {searchOpen ? (
        <label ref={searchPanelRef} className="bf-advanced-formula-tool__search-panel">
          <SearchRoundedIcon fontSize="small" />
          <input
            ref={searchInputRef}
            value={searchValue}
            placeholder="Search variables"
            autoComplete="off"
            onFocus={() => setSearchFocused(true)}
            onChange={(event) => setSearchValue(event.target.value)}
            onKeyDown={handleSearchKeyDown}
          />

          {showSearchAutocomplete ? (
            <div className="bf-advanced-formula-tool__search-autocomplete">
              {searchAutocompleteSuggestions.map((variable, variableIndex) => (
                <button
                  key={`${variable.source}-${variable.key}`}
                  type="button"
                  className={`bf-advanced-formula-tool__search-autocomplete-option ${highlightedSearchIndex === variableIndex ? "bf-advanced-formula-tool__search-autocomplete-option--active" : ""
                    }`}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    addVariable(variable);
                  }}
                >
                  <span>
                    <strong>{getVariableDisplayLabel(variable)}</strong>
                    <small>{variable.key}</small>
                  </span>

                  <strong>{formatValue(variable.value)}</strong>
                </button>
              ))}
            </div>
          ) : null}
        </label>
      ) : null}

      <div className="bf-advanced-formula-tool__quick-bar">
        <button
          ref={searchButtonRef}
          type="button"
          className={`bf-advanced-formula-tool__search-button ${searchOpen ? "bf-advanced-formula-tool__search-button--active" : ""
            }`}
          onClick={() => {
            setSearchOpen((currentValue) => !currentValue);
            setSearchValue("");
            setSearchFocused(false);
            setHighlightedSearchIndex(0);
          }}
          aria-label="Search variables"
        >
          <SearchRoundedIcon fontSize="small" />
        </button>

        <div className="bf-advanced-formula-tool__quick-scroll-wrap">
          <div className="bf-advanced-formula-tool__quick-scroll">
            {hasSearchQuery ? (
              <>
                <span className="bf-advanced-formula-tool__section-label">Search</span>

                {searchedVariables.length === 0 ? (
                  <span className="bf-advanced-formula-tool__quick-empty">No variables found</span>
                ) : (
                  searchedVariables.map((variable) => renderVariableChip(variable))
                )}
              </>
            ) : (
              <>
                <span className="bf-advanced-formula-tool__section-label">Most Used</span>

                {usedQuickVariables.length === 0 ? (
                  <span className="bf-advanced-formula-tool__quick-empty">No variables used yet</span>
                ) : (
                  usedQuickVariables.map((variable) => renderVariableChip(variable))
                )}

                {remainingQuickVariables.length > 0 ? <span className="bf-advanced-formula-tool__section-divider" /> : null}

                {remainingQuickVariables.map((variable) => renderVariableChip(variable))}
              </>
            )}
          </div>
        </div>
      </div>

      <div
        className={`bf-advanced-formula-tool__input ${draggedVariableKey ? "bf-advanced-formula-tool__input--dragging-over" : ""
          }`}
        onMouseDown={handleFormulaInputAreaMouseDown}
        onClick={focusInput}
        onDragOver={handleFormulaDragOver}
        onDragLeave={() => setDropPreviewIndex(null)}
        onDrop={handleFormulaDrop}
      >
        {renderDropPreview(0)}

        {tokens.map((token, tokenIndex) => {
          const matchingVariable = variables.find((variable) => variable.key === token.value);
          const tokenAccent = token.type === "variable" ? variableAccentByIndex[tokenIndex % variableAccentByIndex.length] : undefined;

          if (token.type !== "variable") {
            return (
              <span key={token.id} className="bf-advanced-formula-tool__token-wrap">
                {renderInput(tokenIndex)}

                <span
                  ref={(element) => {
                    if (element) {
                      tokenRefs.current.set(token.id, element);
                    } else {
                      tokenRefs.current.delete(token.id);
                    }
                  }}
                  className="bf-advanced-formula-tool__plain-token"
                >
                  {token.value}
                </span>

                {renderDropPreview(tokenIndex + 1)}
              </span>
            );
          }

          return (
            <span key={token.id} className="bf-advanced-formula-tool__token-wrap">
              {renderInput(tokenIndex)}

              <Tooltip
                title={matchingVariable ? `${getVariableDisplayLabel(matchingVariable)}: ${formatValue(matchingVariable.value)}` : ""}
                disableHoverListener={!matchingVariable}
                arrow
              >
                <button
                  ref={(element) => {
                    if (element) {
                      tokenRefs.current.set(token.id, element);
                    } else {
                      tokenRefs.current.delete(token.id);
                    }
                  }}
                  type="button"
                  className={`bf-advanced-formula-tool__token ${tokenAccent ? `bf-advanced-formula-tool__token--${tokenAccent}` : ""
                    }`}
                  style={
                    matchingVariable?.color
                      ? ({
                        "--bf-variable-color": matchingVariable.color,
                      } as CSSProperties)
                      : undefined
                  }
                  onClick={(event) => event.stopPropagation()}
                >
                  <span className="bf-advanced-formula-tool__token-content">
                    <span className="bf-advanced-formula-tool__token-text">
                      {matchingVariable ? getVariableDisplayLabel(matchingVariable) : token.value}
                    </span>

                    {matchingVariable ? (
                      <small className="bf-advanced-formula-tool__token-value">{formatValue(matchingVariable.value)}</small>
                    ) : null}
                  </span>

                  <span
                    role="button"
                    tabIndex={0}
                    className="bf-advanced-formula-tool__token-remove"
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

              {renderDropPreview(tokenIndex + 1)}
            </span>
          );
        })}

        {renderInput(tokens.length)}
      </div>

      {showVariableSuggestions ? (
        <div className="bf-advanced-formula-tool__suggestions">
          {filteredVariableSuggestions.map((variable, variableIndex) => (
            <button
              key={`${variable.source}-${variable.key}`}
              type="button"
              className={`bf-advanced-formula-tool__suggestion ${highlightedSuggestionIndex === variableIndex ? "bf-advanced-formula-tool__suggestion--active" : ""
                }`}
              onMouseDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
                addVariable(variable);
              }}
            >
              <span className="bf-advanced-formula-tool__suggestion-info">
                <strong>{getVariableDisplayLabel(variable)}</strong>
                <small>{variable.key}</small>
              </span>

              <span className="bf-advanced-formula-tool__suggestion-value">{formatValue(variable.value)}</span>
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
};

export default AdvancedFormulaTool;