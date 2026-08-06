export type CalculationResult = {
  value: number | null;
  error?: string;
};

export type ExpressionVariable = {
  key: string;
  label: string;
  value: number;
  color?: string | null;
};

export type CalculationMessages = {
  validNumber: string;
  invalidCalculation: string;
};

type Token = number | "+" | "-" | "*" | "/" | "(" | ")";

const normalizeVariableKey = (value: string) => {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
};

const resolveVariableValue = (value: string, variables: ExpressionVariable[]) => {
  const normalizedValue = normalizeVariableKey(value);
  const variable = variables.find(
    (item) => normalizeVariableKey(item.key) === normalizedValue || normalizeVariableKey(item.label) === normalizedValue,
  );

  return variable?.value ?? null;
};

const tokenizeExpression = (expression: string, variables: ExpressionVariable[]): Token[] | null => {
  const tokens: Token[] = [];
  let index = 0;

  while (index < expression.length) {
    const character = expression[index];

    if (/\s/.test(character)) {
      index += 1;
      continue;
    }

    if ("+-*/()".includes(character)) {
      tokens.push(character as Token);
      index += 1;
      continue;
    }

    if (character === "[") {
      const closingIndex = expression.indexOf("]", index + 1);
      if (closingIndex < 0) return null;

      const variableValue = resolveVariableValue(expression.slice(index + 1, closingIndex), variables);
      if (variableValue === null) return null;

      tokens.push(variableValue);
      index = closingIndex + 1;
      continue;
    }

    if (/[a-zA-Z_]/.test(character)) {
      let variableText = "";

      while (index < expression.length && /[a-zA-Z0-9_]/.test(expression[index])) {
        variableText += expression[index];
        index += 1;
      }

      const variableValue = resolveVariableValue(variableText, variables);
      if (variableValue === null) return null;

      tokens.push(variableValue);
      continue;
    }

    if (/\d|[.,]/.test(character)) {
      let numberText = "";
      let separatorCount = 0;

      while (index < expression.length && /\d|[.,]/.test(expression[index])) {
        const numberCharacter = expression[index];

        if (numberCharacter === "." || numberCharacter === ",") separatorCount += 1;

        numberText += numberCharacter;
        index += 1;
      }

      if (separatorCount > 1 || numberText === "." || numberText === ",") return null;

      const numberValue = Number(numberText.replace(",", "."));
      if (!Number.isFinite(numberValue)) return null;

      tokens.push(numberValue);
      continue;
    }

    return null;
  }

  return tokens;
};

export const evaluateNumericExpression = (
  expression: string,
  variables: ExpressionVariable[] = [],
  messages: CalculationMessages = {
    validNumber: "Enter a valid number or calculation.",
    invalidCalculation: "This calculation is not valid.",
  },
): CalculationResult => {
  const tokens = tokenizeExpression(expression.trim(), variables);

  if (!tokens?.length) {
    return { value: null, error: messages.validNumber };
  }

  let position = 0;

  const parsePrimary = (): number | null => {
    const token = tokens[position];

    if (token === "+" || token === "-") {
      position += 1;
      const value = parsePrimary();
      if (value === null) return null;
      return token === "-" ? -value : value;
    }

    if (token === "(") {
      position += 1;
      const value = parseAdditive();

      if (value === null || tokens[position] !== ")") return null;

      position += 1;
      return value;
    }

    if (typeof token !== "number") return null;

    position += 1;
    return token;
  };

  const parseMultiplicative = (): number | null => {
    let value = parsePrimary();
    if (value === null) return null;

    while (tokens[position] === "*" || tokens[position] === "/") {
      const operator = tokens[position];
      position += 1;

      const rightValue = parsePrimary();
      if (rightValue === null || (operator === "/" && rightValue === 0)) return null;

      value = operator === "*" ? value * rightValue : value / rightValue;
    }

    return value;
  };

  const parseAdditive = (): number | null => {
    let value = parseMultiplicative();
    if (value === null) return null;

    while (tokens[position] === "+" || tokens[position] === "-") {
      const operator = tokens[position];
      position += 1;

      const rightValue = parseMultiplicative();
      if (rightValue === null) return null;

      value = operator === "+" ? value + rightValue : value - rightValue;
    }

    return value;
  };

  const value = parseAdditive();

  if (value === null || position !== tokens.length || !Number.isFinite(value)) {
    return { value: null, error: messages.invalidCalculation };
  }

  return { value: Number.parseFloat(value.toFixed(10)) };
};

export const formatCalculationValue = (value: number, separator: "." | ",") => {
  const normalizedValue = String(value);
  return separator === "," ? normalizedValue.replace(".", ",") : normalizedValue;
};
