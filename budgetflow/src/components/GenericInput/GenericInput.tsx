import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type KeyboardEvent,
  type Ref,
} from "react";

import TextField, { type TextFieldProps } from "@mui/material/TextField";
import Popper from "@mui/material/Popper";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { useLanguage } from "../../localization/useLanguage";

import {
  evaluateNumericExpression,
  formatCalculationValue,
  type ExpressionVariable,
} from "./GenericInput.utils";

import "./GenericInput.styles.less";

export type GenericInputProps = Omit<TextFieldProps, "onKeyDown"> & {
  allowCalculations?: boolean;
  formulaVariables?: ExpressionVariable[];
  decimalSeparator?: "." | ",";
  onCalculation?: (value: number, displayValue: string, expression: string) => void;
  onValueChange?: (value: string) => void;
  onCommit?: (value: string) => void;
  onCancel?: () => void;
  unstyled?: boolean;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
};

const GenericInput = ({
  allowCalculations = false,
  formulaVariables = [],
  decimalSeparator = ".",
  onCalculation,
  onValueChange,
  onCommit,
  onCancel,
  unstyled = false,
  onChange,
  onKeyDown,
  onBlur,
  className = "",
  value,
  inputRef,
  placeholder,
  autoComplete,
  autoFocus,
  disabled,
  id,
  name,
  required,
  inputMode,
  ...textFieldProps
}: GenericInputProps) => {
  const { activeLanguage } = useLanguage();
  const dictionary = activeLanguage.dictionary;
  const [calculationError, setCalculationError] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [highlightedSuggestionIndex, setHighlightedSuggestionIndex] = useState(0);
  const [suggestionAnchor, setSuggestionAnchor] = useState<HTMLDivElement | null>(null);
  const internalInputRef = useRef<HTMLInputElement | null>(null);
  const pendingCaretPositionRef = useRef<number | null>(null);

  const currentValue = value === null || value === undefined ? "" : String(value);

  const expressionParts = useMemo(() => {
    const parts: Array<{
      type: "text" | "variable";
      value: string;
      start: number;
      end: number;
      variable?: ExpressionVariable;
    }> = [];
    const pattern = /\[([^\]]+)\]/g;
    let cursor = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(currentValue))) {
      if (match.index > cursor) {
        parts.push({ type: "text", value: currentValue.slice(cursor, match.index), start: cursor, end: match.index });
      }

      const label = match[1].trim();
      const normalizedLabel = label.toLocaleLowerCase();
      const variable = formulaVariables.find(
        (item) => item.label.toLocaleLowerCase() === normalizedLabel || item.key.toLocaleLowerCase() === normalizedLabel,
      );

      parts.push({
        type: "variable",
        value: label,
        start: match.index,
        end: pattern.lastIndex,
        variable,
      });
      cursor = pattern.lastIndex;
    }

    if (cursor < currentValue.length) {
      parts.push({ type: "text", value: currentValue.slice(cursor), start: cursor, end: currentValue.length });
    }

    return parts;
  }, [currentValue, formulaVariables]);

  const hasVariableTokens = allowCalculations && expressionParts.some((part) => part.type === "variable");

  useLayoutEffect(() => {
    const caretPosition = pendingCaretPositionRef.current;
    if (caretPosition === null) return;

    internalInputRef.current?.setSelectionRange(caretPosition, caretPosition);
    pendingCaretPositionRef.current = null;
  }, [currentValue]);

  const setInputRef = (element: HTMLInputElement | null) => {
    internalInputRef.current = element;

    if (typeof inputRef === "function") {
      inputRef(element);
      return;
    }

    if (inputRef) {
      (inputRef as { current: HTMLInputElement | null }).current = element;
    }
  };

  const removeExpressionPart = (start: number, end: number) => {
    const before = currentValue.slice(0, start).replace(/\s+$/, "");
    const after = currentValue.slice(end).replace(/^\s+/, "");
    const separator = before && after && !/[+\-*/(]\s*$/.test(before) && !/^\s*[+\-*/)]/.test(after) ? " " : "";
    const nextValue = `${before}${separator}${after}`;

    pendingCaretPositionRef.current = before.length + separator.length;
    onValueChange?.(nextValue);
  };

  const variableSearch = useMemo(() => {
    const unmatchedBracketIndex = currentValue.lastIndexOf("[");
    const lastClosingBracketIndex = currentValue.lastIndexOf("]");

    if (unmatchedBracketIndex > lastClosingBracketIndex) {
      return {
        query: currentValue.slice(unmatchedBracketIndex + 1).trim(),
        replaceFrom: unmatchedBracketIndex,
      };
    }

    const trailingChunk = currentValue.match(/[^+\-*/()]+$/)?.[0] ?? "";
    const query = trailingChunk.trim();

    return {
      query,
      replaceFrom: query ? currentValue.lastIndexOf(query) : currentValue.length,
    };
  }, [currentValue]);

  const variableSuggestions = useMemo(() => {
    if (!variableSearch.query) return [];

    const normalizedQuery = variableSearch.query
      .toLocaleLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    return formulaVariables
      .filter((variable) => {
        const searchableValue = `${variable.label} ${variable.key}`
          .toLocaleLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");

        return searchableValue.includes(normalizedQuery);
      })
      .slice(0, 6);
  }, [formulaVariables, variableSearch.query]);

  const showVariableSuggestions = isFocused && variableSuggestions.length > 0;

  const selectVariable = (variable: ExpressionVariable) => {
    const prefix = currentValue.slice(0, variableSearch.replaceFrom);
    const separator = prefix && !/[\s+\-*/(]$/.test(prefix) ? " " : "";
    const nextValue = `${prefix}${separator}[${variable.label}]`;

    pendingCaretPositionRef.current = nextValue.length;
    onValueChange?.(nextValue);
    setHighlightedSuggestionIndex(0);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (showVariableSuggestions && event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightedSuggestionIndex((currentIndex) =>
        Math.min(currentIndex + 1, variableSuggestions.length - 1),
      );
      return;
    }

    if (showVariableSuggestions && event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedSuggestionIndex((currentIndex) => Math.max(currentIndex - 1, 0));
      return;
    }

    if (showVariableSuggestions && event.key === "Enter") {
      event.preventDefault();
      selectVariable(variableSuggestions[highlightedSuggestionIndex] ?? variableSuggestions[0]);
      return;
    }

    if (showVariableSuggestions && event.key === "Escape") {
      event.preventDefault();
      setIsFocused(false);
      return;
    }

    if (event.key === "Escape" && onCancel) {
      event.preventDefault();
      setCalculationError("");
      onCancel();
      return;
    }

    if (allowCalculations && (event.key === "Backspace" || event.key === "Delete")) {
      const start = event.currentTarget.selectionStart ?? currentValue.length;
      const end = event.currentTarget.selectionEnd ?? start;

      if (start === end) {
        const matchingPart = expressionParts.find((part) => {
          if (part.type !== "variable") return false;
          return event.key === "Backspace" ? part.end === start : part.start === start;
        });

        if (matchingPart) {
          event.preventDefault();
          removeExpressionPart(matchingPart.start, matchingPart.end);
          return;
        }
      }
    }

    if (event.key === "Enter" && allowCalculations) {
      const result = evaluateNumericExpression(currentValue, formulaVariables, dictionary.genericInput);

      if (result.value === null) {
        event.preventDefault();
        setCalculationError(result.error ?? dictionary.genericInput.invalidCalculation);
        return;
      }

      const displayValue = formatCalculationValue(result.value, decimalSeparator);

      event.preventDefault();
      setCalculationError("");
      onCalculation?.(result.value, displayValue, currentValue);
      onCommit?.(displayValue);
      return;
    }

    if (event.key === "Enter" && onCommit) {
      event.preventDefault();
      setCalculationError("");
      onCommit(currentValue);
      return;
    }

    onKeyDown?.(event);
  };

  const handleVariableDragOver = (event: DragEvent<HTMLElement>) => {
    if (!formulaVariables.length || !event.dataTransfer.types.includes("application/budgetflow-variable-key")) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  };

  const handleVariableDrop = (event: DragEvent<HTMLElement>) => {
    const variableKey = event.dataTransfer.getData("application/budgetflow-variable-key");
    const variable = formulaVariables.find((item) => item.key === variableKey);
    if (!variable) return;

    event.preventDefault();

    const separator = currentValue.trim() ? " " : "";
    const nextValue = `${currentValue}${separator}[${variable.label}]`;

    pendingCaretPositionRef.current = nextValue.length;
    onValueChange?.(nextValue);
  };

  if (unstyled) {
    return (
      <input
        ref={setInputRef as Ref<HTMLInputElement>}
        value={currentValue}
        placeholder={placeholder}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        disabled={disabled}
        id={id}
        name={name}
        required={required}
        inputMode={inputMode}
        onFocus={(event) => {
          setIsFocused(true);
          setHighlightedSuggestionIndex(0);
          textFieldProps.onFocus?.(event);
        }}
        onChange={(event) => {
          setCalculationError("");
          onValueChange?.(event.target.value);
          onChange?.(event);
        }}
        onDragOver={handleVariableDragOver}
        onDrop={handleVariableDrop}
        onKeyDown={handleKeyDown}
        onBlur={(event) => {
          setIsFocused(false);
          setCalculationError("");
          onBlur?.(event);
        }}
        aria-invalid={Boolean(calculationError) || textFieldProps.error || undefined}
        title={calculationError || textFieldProps.title}
        className={`bf-generic-input-native ${calculationError ? "bf-generic-input-native--invalid" : ""} ${className}`.trim()}
      />
    );
  }

  return (
    <div ref={setSuggestionAnchor} className="bf-generic-input-shell">
      <TextField
        {...textFieldProps}
        value={value}
        inputRef={setInputRef}
        placeholder={placeholder}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        disabled={disabled}
        id={id}
        name={name}
        required={required}
        inputMode={inputMode}
        onFocus={(event) => {
          setIsFocused(true);
          setHighlightedSuggestionIndex(0);
          textFieldProps.onFocus?.(event);
        }}
        onChange={(event) => {
          setCalculationError("");
          setHighlightedSuggestionIndex(0);
          onValueChange?.(event.target.value);
          onChange?.(event);
        }}
        onDragOver={handleVariableDragOver}
        onDrop={handleVariableDrop}
        onKeyDown={(event) => handleKeyDown(event as unknown as KeyboardEvent<HTMLInputElement>)}
        onBlur={(event) => {
          setIsFocused(false);
          setCalculationError("");
          onBlur?.(event);
        }}
        error={Boolean(calculationError) || textFieldProps.error}
        title={calculationError || textFieldProps.title}
        aria-invalid={Boolean(calculationError) || textFieldProps.error || undefined}
        className={`bf-generic-input ${allowCalculations ? "bf-generic-input--calculator" : ""} ${
          hasVariableTokens ? "bf-generic-input--tokens" : ""
        } ${textFieldProps.InputProps?.startAdornment ? "bf-generic-input--with-adornment" : ""} ${className}`.trim()}
      />

      {hasVariableTokens ? (
        <div className="bf-generic-input-token-layer" aria-hidden="true">
          {expressionParts.map((part, index) => {
            if (part.type === "text") {
              return <span key={`${part.start}-${index}`} className="bf-generic-input-token-layer__text">{part.value}</span>;
            }

            return (
              <span
                key={`${part.start}-${part.value}`}
                className="bf-generic-input-token-layer__chip"
                style={
                  {
                    "--bf-token-color": part.variable?.color ?? "var(--bf-primary)",
                  } as CSSProperties
                }
              >
                <span>{part.value}</span>
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={`${dictionary.genericInput.removeVariable} ${part.value}`}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => removeExpressionPart(part.start, part.end)}
                >
                  <CloseRoundedIcon />
                </button>
              </span>
            );
          })}

          {isFocused ? <span className="bf-generic-input-token-layer__caret" /> : null}
        </div>
      ) : null}

      {showVariableSuggestions ? (
        <Popper
          open
          anchorEl={suggestionAnchor}
          placement="bottom-start"
          className="bf-generic-input-suggestions-popper"
          modifiers={[{ name: "offset", options: { offset: [0, 6] } }]}
        >
          <div
            className="bf-generic-input-suggestions"
            style={{ minWidth: Math.max(220, suggestionAnchor?.offsetWidth ?? 0) }}
            role="listbox"
            aria-label={dictionary.genericInput.formulaVariables}
          >
            {variableSuggestions.map((variable, index) => (
              <button
                key={variable.key}
                type="button"
                role="option"
                aria-selected={index === highlightedSuggestionIndex}
                className={`bf-generic-input-suggestions__option ${
                  index === highlightedSuggestionIndex ? "bf-generic-input-suggestions__option--highlighted" : ""
                }`}
                onMouseDown={(event) => {
                  event.preventDefault();
                  selectVariable(variable);
                }}
              >
                <span>{variable.label}</span>
                <small>{variable.value}</small>
              </button>
            ))}
          </div>
        </Popper>
      ) : null}
    </div>
  );
};

export default GenericInput;
