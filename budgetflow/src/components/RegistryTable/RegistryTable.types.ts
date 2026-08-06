import type { IconId } from '../IconSelectorMenu/IconSelectorMenu.types';
import type { LanguageDictionary } from '../../localization/languages';

export type CurrencyOption = {
  code: 'EUR' | 'USD' | 'GBP' | 'BRL';
  label: string;
};

export type DecimalSeparator = '.' | ',';

export type ToastState = {
  open: boolean;
  message: string;
  severity: 'success' | 'info' | 'warning' | 'error';
};

export type TotalStep = {
  id: string;
  label: string;
  value: number;
  running: number;
};

export type Category = {
  id: string;
  name: string;
  color: string;
};

export type RegistryTableBuiltInColumnKey = 'icon' | 'description' | 'current' | 'previous' | 'difference';
export type RegistryTableColumnKey = RegistryTableBuiltInColumnKey | `custom_${string}`;
export type RegistryTableColumnKind = 'icon' | 'text' | 'amount' | 'previous' | 'difference';

export type RegistryTableTextAlign = 'left' | 'center' | 'right';

export type RegistryTableTextSettings = {
  align: RegistryTableTextAlign;
  fontFamily: string;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  color: string;
};

export type RegistryTableColumnSettings = {
  kind: RegistryTableColumnKind;
  header: string;
  backgroundColor?: string;
  headerStyle: RegistryTableTextSettings;
  cellStyle: RegistryTableTextSettings;
};

export type RegistryTableSettings = {
  columns: Record<string, RegistryTableColumnSettings>;
  columnOrder: RegistryTableColumnKey[];
  columnWidths: Record<string, number>;
  showIcons: boolean;
  hiddenColumns?: RegistryTableColumnKey[];
};

const DEFAULT_COLUMN_ORDER: RegistryTableBuiltInColumnKey[] = ['description', 'current', 'previous', 'difference'];

const DEFAULT_COLUMN_WIDTHS: Record<RegistryTableBuiltInColumnKey, number> = {
  icon: 72,
  description: 260,
  current: 220,
  previous: 220,
  difference: 200,
};

const createTextSettings = (
  align: RegistryTableTextAlign,
  bold: boolean,
): RegistryTableTextSettings => ({
  align,
  fontFamily: 'inherit',
  fontSize: 14,
  bold,
  italic: false,
  underline: false,
  strikethrough: false,
  color: '',
});

export const createDefaultRegistryTableSettings = (
  headers?: LanguageDictionary['table']['columns'],
): RegistryTableSettings => ({
  columnOrder: [...DEFAULT_COLUMN_ORDER],
  columnWidths: { ...DEFAULT_COLUMN_WIDTHS },
  showIcons: true,
  hiddenColumns: [],
  columns: {
    icon: {
      kind: 'icon',
      header: headers?.icon ?? 'Icon',
      headerStyle: createTextSettings('center', true),
      cellStyle: createTextSettings('center', true),
    },
    description: {
      kind: 'text',
      header: headers?.description ?? 'Description',
      headerStyle: createTextSettings('left', true),
      cellStyle: createTextSettings('left', false),
    },
    current: {
      kind: 'amount',
      header: headers?.current ?? 'This month',
      headerStyle: createTextSettings('center', true),
      cellStyle: createTextSettings('center', true),
    },
    previous: {
      kind: 'previous',
      header: headers?.previous ?? 'Previous month',
      headerStyle: createTextSettings('center', true),
      cellStyle: createTextSettings('center', true),
    },
    difference: {
      kind: 'difference',
      header: headers?.difference ?? 'Difference',
      headerStyle: createTextSettings('center', true),
      cellStyle: createTextSettings('center', false),
    },
  },
});

const DEFAULT_HEADER_ALIASES: Record<RegistryTableBuiltInColumnKey, string[]> = {
  icon: ['Icon', 'Ícone'],
  description: ['Description', 'Descrição'],
  current: ['This month', 'Este mês'],
  previous: ['Previous month', 'Mês anterior'],
  difference: ['Difference', 'Diferença'],
};

export const normalizeRegistryTableSettings = (
  settings?: Partial<RegistryTableSettings> | null,
  headers?: LanguageDictionary['table']['columns'],
): RegistryTableSettings => {
  const defaults = createDefaultRegistryTableSettings(headers);
  type LegacyColumnSettings = Partial<RegistryTableTextSettings> & {
    kind?: RegistryTableColumnKind;
    header?: string;
    backgroundColor?: string;
    headerStyle?: Partial<RegistryTableTextSettings>;
    cellStyle?: Partial<RegistryTableTextSettings>;
  };

  const rawColumns = (settings?.columns ?? {}) as Record<string, LegacyColumnSettings | undefined>;
  const rawOrder = Array.isArray(settings?.columnOrder) ? settings.columnOrder : [];
  const rawWidths = (settings?.columnWidths ?? {}) as Record<string, number | undefined>;
  const rawHiddenColumns = Array.isArray(settings?.hiddenColumns) ? settings.hiddenColumns : [];
  const hiddenColumns = new Set(rawHiddenColumns);
  const normalizedOrder = (rawOrder.length > 0 ? rawOrder : DEFAULT_COLUMN_ORDER).filter(
    (key, index, order): key is RegistryTableColumnKey =>
      typeof key === 'string' && Boolean(key) && key !== 'icon' && order.indexOf(key) === index && !hiddenColumns.has(key),
  );

  if (normalizedOrder.length === 0) normalizedOrder.push('description');

  const normalizedWidths = Object.fromEntries(
    normalizedOrder.map((key) => {
      const rawWidth = Number(rawWidths[key]);
      const minimumWidth = key === 'icon' ? 58 : 120;
      const width = Number.isFinite(rawWidth)
        ? Math.max(minimumWidth, Math.min(520, rawWidth))
        : defaults.columnWidths[key] ?? 180;

      return [key, width];
    }),
  ) as RegistryTableSettings['columnWidths'];

  return {
    columnOrder: normalizedOrder,
    columnWidths: normalizedWidths,
    showIcons: settings?.showIcons ?? !hiddenColumns.has('icon'),
    hiddenColumns: [],
    columns: Object.fromEntries(
      normalizedOrder.map((key) => {
        const fallback = defaults.columns[key] ?? {
          kind: 'text' as const,
          header: headers?.newColumn ?? 'New column',
          headerStyle: createTextSettings('left', true),
          cellStyle: createTextSettings('left', false),
        };
        const rawColumn = rawColumns[key];
        const legacyCellStyle: Partial<RegistryTableTextSettings> = {
          ...(rawColumn?.align ? { align: rawColumn.align } : {}),
          ...(rawColumn?.fontFamily ? { fontFamily: rawColumn.fontFamily } : {}),
          ...(rawColumn?.fontSize ? { fontSize: rawColumn.fontSize } : {}),
          ...(rawColumn?.bold !== undefined ? { bold: rawColumn.bold } : {}),
          ...(rawColumn?.italic !== undefined ? { italic: rawColumn.italic } : {}),
          ...(rawColumn?.underline !== undefined ? { underline: rawColumn.underline } : {}),
          ...(rawColumn?.strikethrough !== undefined ? { strikethrough: rawColumn.strikethrough } : {}),
          ...(rawColumn?.color !== undefined ? { color: rawColumn.color } : {}),
        };

        return [
          key,
          {
            kind: rawColumn?.kind ?? fallback.kind,
            header:
              key in DEFAULT_HEADER_ALIASES && DEFAULT_HEADER_ALIASES[key as RegistryTableBuiltInColumnKey].includes(rawColumn?.header ?? '')
                ? fallback.header
                : rawColumn?.header ?? fallback.header,
            backgroundColor: rawColumn?.backgroundColor ?? fallback.backgroundColor,
            headerStyle: {
              ...fallback.headerStyle,
              ...(rawColumn?.headerStyle ?? {}),
            },
            cellStyle: {
              ...fallback.cellStyle,
              ...legacyCellStyle,
              ...(rawColumn?.cellStyle ?? {}),
            },
          },
        ];
      }),
    ),
  };
};

export const createRegistryTableColumn = (
  kind: Extract<RegistryTableColumnKind, 'text' | 'amount'>,
  header: string,
): RegistryTableColumnSettings => ({
  kind,
  header,
  headerStyle: createTextSettings(kind === 'text' ? 'left' : 'center', true),
  cellStyle: createTextSettings(kind === 'text' ? 'left' : 'center', kind === 'amount'),
});

export type RegistryRow = {
  id: string;
  seriesId?: string;
  label: string;
  amount: number | null;
  amountExpression?: string;
  customValues?: Record<string, string | number | null>;
  customExpressions?: Record<string, string>;
  prevAmount: number | null;
  note: string;

  iconId: IconId;
  iconImageUrl?: string | null;

  color: string;

  categories: string[];
  recurring: boolean;
};
