import type { CSSProperties, JSX } from 'react';
import './RegistryTable.style.less';

import { Fragment, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  ButtonBase,
  Collapse,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  Paper,
  Popper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';

// Icons
import DragIndicatorRoundedIcon from '@mui/icons-material/DragIndicatorRounded';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import HorizontalRuleRoundedIcon from '@mui/icons-material/HorizontalRuleRounded';
import TrendingDownRoundedIcon from '@mui/icons-material/TrendingDownRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RepeatIcon from '@mui/icons-material/Repeat';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import FormatAlignLeftRoundedIcon from '@mui/icons-material/FormatAlignLeftRounded';
import FormatBoldRoundedIcon from '@mui/icons-material/FormatBoldRounded';
import PaletteRoundedIcon from '@mui/icons-material/PaletteRounded';

import { DragDropContext, Draggable, Droppable, type DropResult } from '@hello-pangea/dnd';

import TotalSumOverview from '../TotalSumOverview/TotalSumOverview';
import IconSelectorMenu from '../IconSelectorMenu/IconSelectorMenu';
import GenericPopup from '../GenericPopup/GenericPopup';
import GenericInput from '../GenericInput/GenericInput';
import { evaluateNumericExpression } from '../GenericInput/GenericInput.utils';
import RowComment from '../RowComment/RowComment';
import TextConfigurationPopup from '../TextConfigurationPopup/TextConfigurationPopup';
import { getReadableTextColor } from '../../utils/colorContrast';
import { useLanguage } from '../../localization/useLanguage';

import { ICON_OPTIONS, COLOR_PRESETS } from '../IconSelectorMenu/IconSelectorMenu.db';
import { normalizeRegistryTableSettings } from './RegistryTable.types';

import type { IconOption } from '../IconSelectorMenu/IconSelectorMenu.types';
import type { FormulaVariable } from '../VariablesViewer/VariablesViewer';
import type {
  Category,
  CurrencyOption,
  DecimalSeparator,
  RegistryTableColumnKey,
  RegistryTableColumnSettings,
  RegistryTableSettings,
  RegistryTableTextAlign,
  RegistryTableTextSettings,
  RegistryRow,
  ToastState,
  TotalStep,
} from './RegistryTable.types';

type Props = {
  title: string;
  invertComparison?: boolean;
  icons?: IconOption[];
  colorPresets?: string[];
  rows: RegistryRow[];
  previousRows?: RegistryRow[];
  onChangeRows: (rows: RegistryRow[]) => void;
  settings?: RegistryTableSettings;
  onChangeSettings?: (settings: RegistryTableSettings) => void;
  formulaVariables?: FormulaVariable[];
  backgroundColor?: string | null;
  contentColor?: string | null;
  outerContentColor?: string | null;
};

const CURRENCIES: CurrencyOption[] = [
  { code: 'EUR', label: 'EUR (€)' },
  { code: 'USD', label: 'USD ($)' },
  { code: 'GBP', label: 'GBP (£)' },
  { code: 'BRL', label: 'BRL (R$)' },
];

const PREVIEW_HEIGHT = 64;

const createId = () => crypto.randomUUID();

const getCurrencySymbol = (currency: CurrencyOption['code'], locale: string) => {
  const parts = new Intl.NumberFormat(locale, { style: 'currency', currency }).formatToParts(0);
  return parts.find((p) => p.type === 'currency')?.value ?? '';
};

const toDisplayNumber = (value: number | null, separator: DecimalSeparator) => {
  if (value === null) return '';
  const raw = String(value);
  return separator === ',' ? raw.replace('.', ',') : raw.replace(',', '.');
};

const formatCurrency = (value: number, currency: CurrencyOption['code'], separator: DecimalSeparator, locale: string) => {
  const formatted = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

  if (separator === ',') return formatted;
  return formatted.replace(/(\d),(\d{2})\b/, '$1.$2');
};

const getComparison = (amount: number | null, prev: number | null, invert: boolean) => {
  if (amount === null || prev === null) return { state: 'neutral' as const, diff: null as number | null };

  const raw = amount - prev;
  const diff = invert ? -raw : raw;

  if (diff > 0) return { state: 'up' as const, diff };
  if (diff < 0) return { state: 'down' as const, diff };

  return { state: 'neutral' as const, diff: 0 };
};

const reorder = <T,>(list: T[], startIndex: number, endIndex: number) => {
  const next = [...list];
  const [removed] = next.splice(startIndex, 1);

  next.splice(endIndex, 0, removed);

  return next;
};

const buildTotalSteps = (rows: RegistryRow[]): TotalStep[] => {
  let running = 0;

  return rows
    .filter((row) => typeof row.amount === 'number')
    .map((row) => {
      running += row.amount as number;

      return {
        id: row.id,
        label: (row.label || '').trim() || '—',
        value: row.amount as number,
        running,
      };
    });
};

const getRowComparisonKey = (row: RegistryRow) => {
  const labelKey = (row.label || '').trim().toLowerCase();
  const iconKey = (row.iconId || '').trim().toLowerCase();

  return `${labelKey}::${iconKey}`;
};

const getColumnTextStyle = (settings: RegistryTableTextSettings): CSSProperties => ({
  color: settings.color || undefined,
  fontFamily: settings.fontFamily === 'inherit' ? undefined : settings.fontFamily,
  fontSize: `${settings.fontSize}px`,
  fontWeight: settings.bold ? 800 : 500,
  fontStyle: settings.italic ? 'italic' : 'normal',
  textDecoration: [settings.underline ? 'underline' : '', settings.strikethrough ? 'line-through' : '']
    .filter(Boolean)
    .join(' ') || 'none',
  textAlign: settings.align,
});

const getCellAlignmentStyle = (align: RegistryTableTextAlign): CSSProperties => ({
  justifyContent: align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center',
  textAlign: align,
});

const ColumnHeader = ({
  column,
  settings,
  highlighted,
  onOpen,
  onChangeHeader,
  onToolMouseEnter,
  onToolMouseLeave,
  onColumnDragStart,
  onColumnDragEnd,
}: {
  column: RegistryTableColumnKey;
  settings: RegistryTableColumnSettings;
  highlighted: boolean;
  onOpen: (event: React.MouseEvent<HTMLElement>, column: RegistryTableColumnKey) => void;
  onChangeHeader: (header: string) => void;
  onToolMouseEnter: () => void;
  onToolMouseLeave: () => void;
  onColumnDragStart: (event: React.DragEvent<HTMLElement>, column: RegistryTableColumnKey) => void;
  onColumnDragEnd: () => void;
}) => {
  const { activeLanguage } = useLanguage();
  const dictionary = activeLanguage.dictionary;
  const [headerElement, setHeaderElement] = useState<HTMLDivElement | null>(null);
  const [editingHeader, setEditingHeader] = useState(false);
  const [headerDraft, setHeaderDraft] = useState(settings.header);

  const startHeaderEdit = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setHeaderDraft(settings.header);
    setEditingHeader(true);
  };

  const finishHeaderEdit = () => {
    const nextHeader = headerDraft.trim();

    if (nextHeader) onChangeHeader(nextHeader);
    setEditingHeader(false);
  };

  return (
    <div
      ref={setHeaderElement}
      className={`bf-registry-table__column-header ${highlighted ? 'bf-registry-table__column-header--highlighted' : ''}`}
    >
      <div
        className="bf-registry-table__column-title"
        style={getCellAlignmentStyle(settings.headerStyle.align)}
      >
        {editingHeader ? (
          <GenericInput
            unstyled
            value={headerDraft}
            onChange={(event) => setHeaderDraft(event.target.value)}
            onBlur={finishHeaderEdit}
            onCommit={finishHeaderEdit}
            onCancel={() => setEditingHeader(false)}
            autoFocus
            className="bf-registry-table__header-input"
            aria-label={`${dictionary.table.editNameOf} ${settings.header}`}
          />
        ) : (
          <span
            className="bf-registry-table__column-label"
            style={getColumnTextStyle(settings.headerStyle)}
            onDoubleClick={startHeaderEdit}
            title={dictionary.table.doubleClickEdit}
          >
            {settings.header}
          </span>
        )}

        <Tooltip title={dictionary.table.editHeaderName} arrow>
          <ButtonBase
            className="bf-registry-table__header-edit"
            onClick={startHeaderEdit}
            aria-label={`${dictionary.table.editNameOf} ${settings.header}`}
          >
            <EditRoundedIcon fontSize="small" />
          </ButtonBase>
        </Tooltip>
      </div>

      <Tooltip title={dictionary.table.dragColumn} arrow>
        <span
          className="bf-registry-table__column-drag-tab"
          role="button"
          tabIndex={0}
          draggable
          onDragStart={(event) => onColumnDragStart(event, column)}
          onDragEnd={onColumnDragEnd}
          aria-label={`${dictionary.table.moveColumn} ${settings.header}`}
        />
      </Tooltip>

      <Popper
        open={highlighted}
        anchorEl={headerElement}
        placement="top"
        popperOptions={{ strategy: 'fixed' }}
        className="bf-registry-table__column-tools-popper"
        modifiers={[{ name: 'offset', options: { offset: [0, 11] } }]}
      >
        <Tooltip title={dictionary.table.formatHeaderCells} arrow>
          <ButtonBase
            className="bf-registry-table__column-tools"
            onClick={(event) => onOpen(event, column)}
            onMouseEnter={onToolMouseEnter}
            onMouseLeave={onToolMouseLeave}
            aria-label={`${dictionary.table.format} ${settings.header || column}`}
          >
            <span className="bf-registry-table__column-tool-icon" aria-hidden="true">
              <FormatAlignLeftRoundedIcon fontSize="small" />
            </span>
            <span className="bf-registry-table__column-tool-icon" aria-hidden="true">
              <FormatBoldRoundedIcon fontSize="small" />
            </span>
            <span className="bf-registry-table__column-tool-icon" aria-hidden="true">
              <PaletteRoundedIcon fontSize="small" />
            </span>
          </ButtonBase>
        </Tooltip>
      </Popper>
    </div>
  );
};

const HeaderPillButton = ({
  label,
  onClick,
}: {
  label: string;
  onClick: (event: React.MouseEvent<HTMLElement>) => void;
}) => (
  <ButtonBase onClick={onClick} className="bf-pill">
    <Typography variant="caption" className="bf-pill__text">
      {label}
    </Typography>
  </ButtonBase>
);

const PreviewRow = ({ isOpen }: { isOpen: boolean }) => (
  <TableRow>
    <TableCell colSpan={7} sx={{ p: 0, borderBottom: isOpen ? undefined : 0 }}>
      <Collapse in={isOpen} timeout={200} unmountOnExit collapsedSize={0}>
        <Box
          sx={{
            height: PREVIEW_HEIGHT,
            display: 'flex',
            alignItems: 'center',
            px: 2,
            background: 'linear-gradient(to right, rgba(25,118,210,0), rgba(25,118,210,0.12))',
            overflow: 'hidden',
          }}
        >
          <Box sx={{ width: 28 }} />

          <Box sx={{ flex: 1, display: 'flex', gap: 2, alignItems: 'center' }}>
            <Box sx={{ width: '34%', height: 34, borderRadius: 1.5, backgroundColor: 'rgba(0,0,0,0.10)' }} />
            <Box sx={{ width: '18%', height: 34, borderRadius: 1.5, backgroundColor: 'rgba(0,0,0,0.10)' }} />
            <Box sx={{ width: '18%', height: 34, borderRadius: 1.5, backgroundColor: 'rgba(0,0,0,0.10)' }} />
            <Box sx={{ width: '12%', height: 34, borderRadius: 1.5, backgroundColor: 'rgba(0,0,0,0.10)' }} />
          </Box>
        </Box>
      </Collapse>
    </TableCell>
  </TableRow>
);

const ComparisonCell = ({
  amount,
  prevAmount,
  invert,
  currency,
  decimalSeparator,
  locale,
  textStyle,
}: {
  amount: number | null;
  prevAmount: number | null;
  invert: boolean;
  currency: CurrencyOption['code'];
  decimalSeparator: DecimalSeparator;
  locale: string;
  textStyle?: CSSProperties;
}) => {
  const meta = getComparison(amount, prevAmount, invert);
  const justifyContent = textStyle?.textAlign === 'left' ? 'flex-start' : textStyle?.textAlign === 'right' ? 'flex-end' : 'center';

  if (meta.diff === null) {
    return (
      <Stack direction="row" spacing={1} alignItems="center" justifyContent={justifyContent} sx={{ color: 'text.primary' }} style={textStyle}>
        <HorizontalRuleRoundedIcon fontSize="small" />
      </Stack>
    );
  }

  if (meta.state === 'up') {
    return (
      <Stack direction="row" spacing={1} alignItems="center" justifyContent={justifyContent} sx={{ color: 'success.main' }} style={textStyle}>
        <TrendingUpRoundedIcon fontSize="small" />
        <Typography variant="body2" style={textStyle}>{formatCurrency(meta.diff, currency, decimalSeparator, locale)}</Typography>
      </Stack>
    );
  }

  if (meta.state === 'down') {
    return (
      <Stack direction="row" spacing={1} alignItems="center" justifyContent={justifyContent} sx={{ color: 'error.main' }} style={textStyle}>
        <TrendingDownRoundedIcon fontSize="small" />
        <Typography variant="body2" style={textStyle}>{formatCurrency(Math.abs(meta.diff), currency, decimalSeparator, locale)}</Typography>
      </Stack>
    );
  }

  return (
    <Stack direction="row" spacing={1} alignItems="center" justifyContent={justifyContent} sx={{ color: 'text.primary' }} style={textStyle}>
      <HorizontalRuleRoundedIcon fontSize="small" />
      <Typography variant="body2" style={textStyle}>{formatCurrency(0, currency, decimalSeparator, locale)}</Typography>
    </Stack>
  );
};

const RegistryTable = ({
  title,
  invertComparison = false,
  icons = ICON_OPTIONS,
  colorPresets = COLOR_PRESETS,
  rows,
  previousRows = [],
  onChangeRows,
  settings,
  onChangeSettings,
  formulaVariables = [],
  backgroundColor,
  contentColor,
  outerContentColor,
}: Props): JSX.Element => {
  const { activeLanguage } = useLanguage();
  const dictionary = activeLanguage.dictionary;
  const defaultRowColor = colorPresets[0] ?? '#1a73e8';
  const tableSettings = useMemo(
    () => normalizeRegistryTableSettings(settings, dictionary.table.columns),
    [settings, dictionary.table.columns],
  );
  const visibleColumnOrder = tableSettings.columnOrder;
  const backgroundIsGradient = Boolean(backgroundColor && /gradient\(/i.test(backgroundColor));
  const resolvedTableContentColor = contentColor ?? getReadableTextColor(backgroundColor);
  const resolvedOuterContentColor = outerContentColor ?? resolvedTableContentColor;

  const labelFocusRef = useRef<HTMLInputElement | null>(null);

  const [editing, setEditing] = useState<{
    rowId: string;
    field: 'label' | 'amount' | 'customText' | 'customAmount';
    column?: RegistryTableColumnKey;
  } | null>(null);
  const [amountDraft, setAmountDraft] = useState('');
  const [currency, setCurrency] = useState<CurrencyOption['code']>('EUR');
  const [decimalSeparator, setDecimalSeparator] = useState<DecimalSeparator>(',');
  const [currencyAnchor, setCurrencyAnchor] = useState<HTMLElement | null>(null);
  const [decimalAnchor, setDecimalAnchor] = useState<HTMLElement | null>(null);
  const [rowEditor, setRowEditor] = useState<{ el: HTMLElement; rowId: string } | null>(null);
  const [previewRowId, setPreviewRowId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>({ open: false, message: '', severity: 'info' });
  const [rowIdPendingDelete, setRowIdPendingDelete] = useState<string | null>(null);
  const [hoveredColumn, setHoveredColumn] = useState<RegistryTableColumnKey | null>(null);
  const [textConfig, setTextConfig] = useState<{ anchorEl: HTMLElement; column: RegistryTableColumnKey } | null>(null);
  const [draggedColumn, setDraggedColumn] = useState<RegistryTableColumnKey | null>(null);
  const [columnDropPreview, setColumnDropPreview] = useState<{
    column: RegistryTableColumnKey;
    position: 'before' | 'after';
  } | null>(null);
  const [columnWidthPreview, setColumnWidthPreview] = useState<{ column: RegistryTableColumnKey; width: number } | null>(null);
  const columnToolsCloseTimeoutRef = useRef<number | null>(null);

  const [categories, setCategories] = useState<Category[]>([
    { id: createId(), name: 'Salary', color: defaultRowColor },
    { id: createId(), name: 'Misc', color: colorPresets[13] ?? '#34a853' },
    { id: createId(), name: 'House', color: colorPresets[4] ?? '#a142f4' },
  ]);

  const currencySymbol = useMemo(
    () => getCurrencySymbol(currency, activeLanguage.locale),
    [currency, activeLanguage.locale],
  );
  const currencyLabel = useMemo(() => CURRENCIES.find((item) => item.code === currency)?.label ?? currency, [currency]);

  const totalSteps = useMemo(() => buildTotalSteps(rows), [rows]);
  const total = useMemo(() => (totalSteps.length ? totalSteps[totalSteps.length - 1].running : 0), [totalSteps]);
  const functionalColumnWidth = tableSettings.showIcons ? 82 : 38;
  const fixedColumnWidth = functionalColumnWidth + 220;
  const tableWidth = useMemo(
    () => fixedColumnWidth + visibleColumnOrder.reduce(
      (width, column) => width + (columnWidthPreview?.column === column ? columnWidthPreview.width : tableSettings.columnWidths[column]),
      0,
    ),
    [fixedColumnWidth, tableSettings, visibleColumnOrder, columnWidthPreview],
  );
  const minimumTableWidth = Math.max(
    620,
    functionalColumnWidth + 200 + visibleColumnOrder.length * 155,
  );

  const previousAmountByKey = useMemo(() => {
    const amountByKey = new Map<string, number>();

    for (const previousRow of previousRows) {
      if (typeof previousRow.amount !== 'number') continue;

      amountByKey.set(getRowComparisonKey(previousRow), previousRow.amount);
    }

    return amountByKey;
  }, [previousRows]);

  const rowPendingDelete = useMemo(
    () => rows.find((row) => row.id === rowIdPendingDelete) ?? null,
    [rowIdPendingDelete, rows],
  );

  const showToast = (message: string, severity: ToastState['severity'] = 'info') => {
    setToast({ open: true, message, severity });
  };

  const updateRow = (id: string, patch: Partial<RegistryRow>) => {
    onChangeRows(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const updateColumnSettings = (column: RegistryTableColumnKey, columnSettings: RegistryTableColumnSettings) => {
    onChangeSettings?.({
      ...tableSettings,
      columns: {
        ...tableSettings.columns,
        [column]: columnSettings,
      },
    });
  };

  const updateTableSettings = (nextSettings: RegistryTableSettings) => {
    onChangeSettings?.(nextSettings);
  };

  const getColumnWidth = (column: RegistryTableColumnKey) => {
    if (columnWidthPreview?.column === column) return columnWidthPreview.width;
    return tableSettings.columnWidths[column];
  };

  const getColumnLayoutWidth = (column: RegistryTableColumnKey) => {
    if (tableWidth <= 0) return `${100 / Math.max(1, visibleColumnOrder.length)}%`;

    return `${(getColumnWidth(column) / tableWidth) * 100}%`;
  };

  const getFixedColumnLayoutWidth = (width: number) => {
    if (tableWidth <= 0) return width;

    return `${(width / tableWidth) * 100}%`;
  };

  const startColumnDrag = (event: React.DragEvent<HTMLElement>, column: RegistryTableColumnKey) => {
    event.stopPropagation();
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/bf-registry-column', column);
    setDraggedColumn(column);
    setColumnDropPreview(null);
  };

  const previewColumnDrop = (event: React.DragEvent<HTMLElement>, targetColumn: RegistryTableColumnKey) => {
    if (!draggedColumn || draggedColumn === targetColumn) {
      setColumnDropPreview(null);
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';

    const targetRect = event.currentTarget.getBoundingClientRect();
    const position = event.clientX < targetRect.left + targetRect.width / 2 ? 'before' : 'after';

    setColumnDropPreview((currentPreview) =>
      currentPreview?.column === targetColumn && currentPreview.position === position
        ? currentPreview
        : { column: targetColumn, position },
    );
  };

  const dropColumn = (
    event: React.DragEvent<HTMLElement>,
    targetColumn: RegistryTableColumnKey,
    position: 'before' | 'after',
  ) => {
    event.preventDefault();
    event.stopPropagation();

    if (!draggedColumn || draggedColumn === targetColumn) {
      setDraggedColumn(null);
      setColumnDropPreview(null);
      return;
    }

    const nextOrder = tableSettings.columnOrder.filter((column) => column !== draggedColumn);
    const targetIndex = nextOrder.indexOf(targetColumn);

    if (targetIndex < 0) return;

    nextOrder.splice(position === 'after' ? targetIndex + 1 : targetIndex, 0, draggedColumn);

    updateTableSettings({
      ...tableSettings,
      columnOrder: nextOrder,
    });
    setDraggedColumn(null);
    setColumnDropPreview(null);
  };

  const startColumnResize = (event: React.MouseEvent<HTMLElement>, column: RegistryTableColumnKey) => {
    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startWidth = getColumnWidth(column);
    const minimumWidth = column === 'icon' ? 58 : 120;
    let nextWidth = startWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      nextWidth = Math.max(minimumWidth, Math.min(520, startWidth + moveEvent.clientX - startX));
      setColumnWidthPreview({ column, width: nextWidth });
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      setColumnWidthPreview(null);
      updateTableSettings({
        ...tableSettings,
        columnWidths: {
          ...tableSettings.columnWidths,
          [column]: nextWidth,
        },
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const resizeColumnByStep = (column: RegistryTableColumnKey, direction: -1 | 1) => {
    const minimumWidth = column === 'icon' ? 58 : 120;
    const nextWidth = Math.max(minimumWidth, Math.min(520, getColumnWidth(column) + direction * 20));

    updateTableSettings({
      ...tableSettings,
      columnWidths: {
        ...tableSettings.columnWidths,
        [column]: nextWidth,
      },
    });
  };

  const showColumnTools = (column: RegistryTableColumnKey) => {
    if (columnToolsCloseTimeoutRef.current) {
      window.clearTimeout(columnToolsCloseTimeoutRef.current);
      columnToolsCloseTimeoutRef.current = null;
    }

    setHoveredColumn(column);
  };

  const hideColumnTools = () => {
    if (columnToolsCloseTimeoutRef.current) {
      window.clearTimeout(columnToolsCloseTimeoutRef.current);
    }

    columnToolsCloseTimeoutRef.current = window.setTimeout(() => {
      setHoveredColumn(null);
      columnToolsCloseTimeoutRef.current = null;
    }, 100);
  };

  const openTextConfiguration = (event: React.MouseEvent<HTMLElement>, column: RegistryTableColumnKey) => {
    event.stopPropagation();
    setTextConfig({ anchorEl: event.currentTarget, column });
  };

  const startEdit = (rowId: string, field: 'label' | 'amount') => {
    setEditing({ rowId, field });

    if (field === 'amount') {
      const row = rows.find((currentRow) => currentRow.id === rowId);
      setAmountDraft(row?.amountExpression?.trim() || toDisplayNumber(row?.amount ?? null, decimalSeparator));
    }

    if (field === 'label') {
      queueMicrotask(() => {
        labelFocusRef.current?.focus();
        labelFocusRef.current?.select();
      });
    }
  };

  const startCustomEdit = (
    row: RegistryRow,
    column: RegistryTableColumnKey,
    kind: 'text' | 'amount',
  ) => {
    setEditing({
      rowId: row.id,
      field: kind === 'amount' ? 'customAmount' : 'customText',
      column,
    });

    if (kind === 'amount') {
      const expression = row.customExpressions?.[column]?.trim();
      const value = row.customValues?.[column];
      setAmountDraft(expression || toDisplayNumber(typeof value === 'number' ? value : null, decimalSeparator));
    }
  };

  const stopEdit = () => {
    setEditing(null);
    setAmountDraft('');
  };

  const commitAmountDraft = (rowId: string) => {
    const expression = amountDraft.trim();

    if (!expression) {
      updateRow(rowId, { amount: null, amountExpression: undefined });
      stopEdit();
      return;
    }

    const evaluation = evaluateNumericExpression(expression, formulaVariables, dictionary.genericInput);

    if (evaluation.value === null) {
      showToast(evaluation.error ?? dictionary.table.invalidExpression, 'error');
      stopEdit();
      return;
    }

    updateRow(rowId, {
      amount: evaluation.value,
      amountExpression: /^[-+]?\d+(?:[.,]\d+)?$/.test(expression) ? undefined : expression,
    });
    stopEdit();
  };

  const commitCustomAmountDraft = (rowId: string, column: RegistryTableColumnKey) => {
    const expression = amountDraft.trim();
    const row = rows.find((currentRow) => currentRow.id === rowId);

    if (!row) {
      stopEdit();
      return;
    }

    if (!expression) {
      updateRow(rowId, {
        customValues: { ...row.customValues, [column]: null },
        customExpressions: { ...row.customExpressions, [column]: '' },
      });
      stopEdit();
      return;
    }

    const evaluation = evaluateNumericExpression(expression, formulaVariables, dictionary.genericInput);

    if (evaluation.value === null) {
      showToast(evaluation.error ?? dictionary.table.invalidExpression, 'error');
      stopEdit();
      return;
    }

    updateRow(rowId, {
      customValues: { ...row.customValues, [column]: evaluation.value },
      customExpressions: {
        ...row.customExpressions,
        [column]: /^[-+]?\d+(?:[.,]\d+)?$/.test(expression) ? '' : expression,
      },
    });
    stopEdit();
  };

  const createEmptyRow = (defaultColor: string): RegistryRow => ({
    id: createId(),
    seriesId: createId(),
    label: dictionary.table.newRow,
    amount: null,
    customValues: {},
    customExpressions: {},
    prevAmount: null,
    note: '',
    iconId: 'other',
    iconImageUrl: null,
    color: defaultColor,
    categories: [],
    recurring: false,
  });

  const insertRowAt = (index: number) => {
    const nextRow = createEmptyRow(defaultRowColor);
    const nextRows = [...rows];

    nextRows.splice(index, 0, nextRow);
    onChangeRows(nextRows);

    setPreviewRowId(null);
    setEditing({ rowId: nextRow.id, field: 'label' });
    showToast(dictionary.table.rowAdded, 'success');
  };

  const requestRemoveRow = (id: string) => {
    setRowIdPendingDelete(id);
  };

  const confirmRemoveRow = () => {
    if (!rowIdPendingDelete) return;

    onChangeRows(rows.filter((row) => row.id !== rowIdPendingDelete));
    setRowIdPendingDelete(null);
    showToast(dictionary.table.rowRemoved, 'info');
  };

  const cancelRemoveRow = () => {
    setRowIdPendingDelete(null);
  };

  const onDragEnd = (result: DropResult) => {
    setPreviewRowId(null);

    const destinationIndex = result.destination?.index;
    if (destinationIndex === undefined) return;

    const sourceIndex = result.source.index;
    if (destinationIndex === sourceIndex) return;

    onChangeRows(reorder(rows, sourceIndex, destinationIndex));
  };

  const getIconRender = (iconId: string) => {
    const found = icons.find((icon) => icon.id === iconId);
    const fallback = icons.find((icon) => icon.id === 'other') ?? icons[0];

    return (found ?? fallback).render;
  };

  const renderRowIcon = (row: RegistryRow) => {
    if (row.iconImageUrl) {
      return (
        <img
          src={row.iconImageUrl}
          alt=""
          className="bf-registry-table__custom-icon-image"
          style={{
            width: 26,
            height: 26,
            objectFit: 'cover',
            display: 'block',
            borderRadius: 7,
          }}
        />
      );
    }

    const IconComp = getIconRender(row.iconId);

    return IconComp({ fontSize: 'small' });
  };

  const createCategory = (name: string) => {
    const clean = name.trim();

    if (!clean) return;

    const exists = categories.some((category) => category.name.toLowerCase() === clean.toLowerCase());
    if (exists) return;

    const next: Category = {
      id: createId(),
      name: clean,
      color: colorPresets[categories.length % colorPresets.length] ?? defaultRowColor,
    };

    setCategories((currentCategories) => [next, ...currentCategories]);
  };

  const renderColumnHeader = (column: RegistryTableColumnKey) => {
    const columnSettings = tableSettings.columns[column];
    const dropPosition = columnDropPreview?.column === column ? columnDropPreview.position : null;

    return (
      <TableCell
        key={column}
        width={getColumnLayoutWidth(column)}
        align={columnSettings.headerStyle.align}
        className={`bf-registry-table__column bf-registry-table__column--${column} ${
          draggedColumn === column ? 'bf-registry-table__column--dragging' : ''
        } ${dropPosition ? `bf-registry-table__column--drop-${dropPosition}` : ''}`}
        style={{
          background: columnSettings.backgroundColor || undefined,
          color:
            columnSettings.headerStyle.color ||
            (columnSettings.backgroundColor ? getReadableTextColor(columnSettings.backgroundColor) : resolvedTableContentColor),
          '--bf-registry-column-content':
            columnSettings.headerStyle.color ||
            (columnSettings.backgroundColor ? getReadableTextColor(columnSettings.backgroundColor) : resolvedTableContentColor),
        } as CSSProperties}
        onMouseEnter={() => showColumnTools(column)}
        onFocus={() => showColumnTools(column)}
        onDragOver={(event) => previewColumnDrop(event, column)}
        onDragLeave={(event) => {
          if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
          if (columnDropPreview?.column === column) setColumnDropPreview(null);
        }}
        onDrop={(event) => dropColumn(event, column, dropPosition ?? 'before')}
      >
        <ColumnHeader
          column={column}
          settings={columnSettings}
          highlighted={hoveredColumn === column || textConfig?.column === column}
          onOpen={openTextConfiguration}
          onChangeHeader={(header) => updateColumnSettings(column, { ...columnSettings, header })}
          onToolMouseEnter={() => showColumnTools(column)}
          onToolMouseLeave={hideColumnTools}
          onColumnDragStart={startColumnDrag}
          onColumnDragEnd={() => {
            setDraggedColumn(null);
            setColumnDropPreview(null);
          }}
        />

        <span
          className="bf-registry-table__column-resize-handle"
          role="separator"
          tabIndex={0}
          aria-orientation="vertical"
          aria-label={`${dictionary.table.resizeColumn} ${columnSettings.header}`}
          onMouseDown={(event) => startColumnResize(event, column)}
          onKeyDown={(event) => {
            if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
            event.preventDefault();
            resizeColumnByStep(column, event.key === 'ArrowLeft' ? -1 : 1);
          }}
        />
      </TableCell>
    );
  };

  return (
    <section
      className="bf-registry-table"
      style={
        {
          '--bf-registry-surface': backgroundColor || 'color-mix(in srgb, var(--bf-surface-bg) 92%, transparent)',
          '--bf-registry-header-bg': backgroundIsGradient
            ? 'transparent'
            : 'color-mix(in srgb, var(--bf-registry-surface, var(--bf-surface-bg)) 94%, transparent)',
          '--bf-registry-content': resolvedOuterContentColor,
          '--bf-registry-table-content': resolvedTableContentColor,
        } as CSSProperties
      }
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" className="bf-registry-table__header">
        <Stack direction="row" spacing={1} alignItems="center" className="bf-registry-table__header-right">
          <TotalSumOverview title={dictionary.table.sum} steps={totalSteps} total={total} formatValue={(value) => formatCurrency(value, currency, decimalSeparator, activeLanguage.locale)} />

          <Typography variant="body1" fontWeight={600}>
            {dictionary.table.total}: {formatCurrency(total, currency, decimalSeparator, activeLanguage.locale)}
          </Typography>
        </Stack>
      </Stack>

      <TableContainer component={Paper} variant="outlined" className="bf-registry-table__surface">
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId={`${title}-table`}>
            {(droppableProvided) => (
              <Table
                ref={droppableProvided.innerRef}
                {...droppableProvided.droppableProps}
                size="small"
                className="bf-registry-table__table"
                style={{ width: '100%', minWidth: minimumTableWidth, tableLayout: 'fixed' }}
                onMouseLeave={hideColumnTools}
              >
                <colgroup>
                  <col style={{ width: getFixedColumnLayoutWidth(functionalColumnWidth) }} />
                  {visibleColumnOrder.map((column) => (
                    <col key={column} style={{ width: getColumnLayoutWidth(column) }} />
                  ))}
                  <col style={{ width: getFixedColumnLayoutWidth(220) }} />
                </colgroup>

                <TableHead>
                  <TableRow>
                    <TableCell
                      width={getFixedColumnLayoutWidth(functionalColumnWidth)}
                      align="center"
                      className="bf-registry-table__drag-column"
                    />
                    {visibleColumnOrder.map(renderColumnHeader)}
                    <TableCell width={getFixedColumnLayoutWidth(220)} align="center">
                      <div className="bf-registry-table__header-pills bf-registry-table__header-pills--controls">
                        <div className="bf-registry-table__header-controls">
                          <Tooltip title={currencyLabel}>
                            <Box>
                              <HeaderPillButton label={currencySymbol} onClick={(event) => setCurrencyAnchor(event.currentTarget)} />
                            </Box>
                          </Tooltip>

                          <Tooltip title={dictionary.table.decimalSeparator}>
                            <Box>
                              <HeaderPillButton
                                label={decimalSeparator === ',' ? '1,23' : '1.23'}
                                onClick={(event) => setDecimalAnchor(event.currentTarget)}
                              />
                            </Box>
                          </Tooltip>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={visibleColumnOrder.length + 2} align="center" className="bf-registry-table__empty-cell">
                        <div className="bf-registry-table__empty-state">
                          <Typography variant="body2" className="bf-registry-table__empty-title">
                            {dictionary.table.emptyTitle}
                          </Typography>

                          <Typography variant="caption" className="bf-registry-table__empty-description">
                            {dictionary.table.emptyDescriptionPrefix} {title.toLowerCase()}.
                          </Typography>

                          <ButtonBase className="bf-pill bf-registry-table__empty-action" onClick={() => insertRowAt(0)}>
                            <AddCircleOutlineIcon fontSize="small" />
                            <span>{dictionary.table.addFirstRow}</span>
                          </ButtonBase>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : null}

                  {rows.map((row, index) => {
                    const rowBg = 'color-mix(in srgb, var(--bf-primary) 7%, transparent)';
                    const isEditingRow = editing?.rowId === row.id;
                    const previousAmount = previousAmountByKey.get(getRowComparisonKey(row)) ?? null;

                    const renderRowColumn = (column: RegistryTableColumnKey) => {
                      const columnSettings = tableSettings.columns[column];
                      const isDropTarget = columnDropPreview?.column === column;
                      const cellProps = {
                        align: columnSettings.cellStyle.align,
                        className: `bf-registry-table__column bf-registry-table__column--${column} ${
                          isDropTarget ? 'bf-registry-table__column--drop-target' : ''
                        }`,
                        onMouseEnter: () => showColumnTools(column),
                        style: {
                          background: columnSettings.backgroundColor || undefined,
                          color:
                            columnSettings.cellStyle.color ||
                            (columnSettings.backgroundColor
                              ? getReadableTextColor(columnSettings.backgroundColor)
                              : resolvedTableContentColor),
                          '--bf-registry-column-content':
                            columnSettings.cellStyle.color ||
                            (columnSettings.backgroundColor
                              ? getReadableTextColor(columnSettings.backgroundColor)
                              : resolvedTableContentColor),
                        } as CSSProperties,
                      } as const;

                      if (column === 'description') {
                        return (
                          <TableCell key={column} {...cellProps}>
                            {isEditingRow && editing?.field === 'label' ? (
                              <GenericInput
                                value={row.label}
                                onChange={(event) => updateRow(row.id, { label: event.target.value })}
                                onBlur={stopEdit}
                                onCommit={stopEdit}
                                onCancel={stopEdit}
                                size="small"
                                fullWidth
                                placeholder={dictionary.table.examplePaycheck}
                                inputProps={{ style: getColumnTextStyle(columnSettings.cellStyle) }}
                                inputRef={(element) => {
                                  labelFocusRef.current = element;
                                }}
                                autoFocus
                                className="bf-registry-table__cell-input"
                              />
                            ) : (
                              <div
                                className="bf-cell"
                                onClick={() => startEdit(row.id, 'label')}
                                style={getCellAlignmentStyle(columnSettings.cellStyle.align)}
                              >
                                <Typography variant="body2" style={getColumnTextStyle(columnSettings.cellStyle)}>
                                  {(row.label || '').trim() ? row.label : <span className="bf-cell__placeholder">{dictionary.table.examplePaycheck}</span>}
                                </Typography>
                              </div>
                            )}
                          </TableCell>
                        );
                      }

                      if (column === 'current') {
                        return (
                          <TableCell key={column} {...cellProps}>
                            {isEditingRow && editing?.field === 'amount' ? (
                              <GenericInput
                                value={amountDraft}
                                onValueChange={setAmountDraft}
                                onBlur={() => commitAmountDraft(row.id)}
                                allowCalculations
                                formulaVariables={formulaVariables}
                                decimalSeparator={decimalSeparator}
                                onCalculation={(value, displayValue, expression) => {
                                  setAmountDraft(displayValue);
                                  const cleanExpression = expression.trim();
                                  updateRow(row.id, {
                                    amount: value,
                                    amountExpression: /^[-+]?\d+(?:[.,]\d+)?$/.test(cleanExpression)
                                      ? undefined
                                      : cleanExpression,
                                  });
                                }}
                                onCommit={stopEdit}
                                onCancel={stopEdit}
                                size="small"
                                fullWidth
                                inputMode={formulaVariables.length > 0 ? 'text' : 'decimal'}
                                placeholder={dictionary.table.exampleFormula}
                                inputProps={{ style: getColumnTextStyle(columnSettings.cellStyle) }}
                                InputProps={{
                                  startAdornment: <InputAdornment position="start">{currencySymbol}</InputAdornment>,
                                }}
                                autoFocus
                                className="bf-registry-table__cell-input"
                              />
                            ) : (
                              <div
                                className={`bf-cell ${row.amountExpression ? 'bf-cell--formula' : ''}`}
                                onClick={() => startEdit(row.id, 'amount')}
                                style={getCellAlignmentStyle(columnSettings.cellStyle.align)}
                                title={row.amountExpression ? `fx ${row.amountExpression}` : undefined}
                              >
                                {row.amountExpression ? <span className="bf-registry-table__formula-mark">fx</span> : null}
                                <Typography variant="body2" style={getColumnTextStyle(columnSettings.cellStyle)}>
                                  {row.amount === null ? (
                                    <span className="bf-cell__placeholder">{currencySymbol} 0</span>
                                  ) : (
                                    formatCurrency(row.amount, currency, decimalSeparator, activeLanguage.locale)
                                  )}
                                </Typography>
                              </div>
                            )}
                          </TableCell>
                        );
                      }

                      if (column === 'previous') {
                        return (
                          <TableCell key={column} {...cellProps}>
                            <div className="bf-cell bf-cell--readonly" style={getCellAlignmentStyle(columnSettings.cellStyle.align)}>
                              <Typography variant="body2" style={getColumnTextStyle(columnSettings.cellStyle)}>
                                {previousAmount === null ? (
                                  <span className="bf-cell__placeholder">{currencySymbol} 0</span>
                                ) : (
                                  formatCurrency(previousAmount, currency, decimalSeparator, activeLanguage.locale)
                                )}
                              </Typography>
                            </div>
                          </TableCell>
                        );
                      }

                      if (columnSettings.kind === 'text') {
                        const value = String(row.customValues?.[column] ?? '');
                        const isEditingCell = isEditingRow && editing?.field === 'customText' && editing.column === column;

                        return (
                          <TableCell key={column} {...cellProps}>
                            {isEditingCell ? (
                              <GenericInput
                                value={value}
                                onValueChange={(nextValue) =>
                                  updateRow(row.id, {
                                    customValues: { ...row.customValues, [column]: nextValue },
                                  })
                                }
                                onBlur={stopEdit}
                                onCommit={stopEdit}
                                onCancel={stopEdit}
                                size="small"
                                fullWidth
                                placeholder={dictionary.table.write}
                                inputProps={{ style: getColumnTextStyle(columnSettings.cellStyle) }}
                                autoFocus
                                className="bf-registry-table__cell-input"
                              />
                            ) : (
                              <div
                                className="bf-cell"
                                onClick={() => startCustomEdit(row, column, 'text')}
                                style={getCellAlignmentStyle(columnSettings.cellStyle.align)}
                              >
                                <Typography variant="body2" style={getColumnTextStyle(columnSettings.cellStyle)}>
                                  {value.trim() ? value : <span className="bf-cell__placeholder">—</span>}
                                </Typography>
                              </div>
                            )}
                          </TableCell>
                        );
                      }

                      if (columnSettings.kind === 'amount') {
                        const value = row.customValues?.[column];
                        const numericValue = typeof value === 'number' ? value : null;
                        const expression = row.customExpressions?.[column]?.trim();
                        const isEditingCell = isEditingRow && editing?.field === 'customAmount' && editing.column === column;

                        return (
                          <TableCell key={column} {...cellProps}>
                            {isEditingCell ? (
                              <GenericInput
                                value={amountDraft}
                                onValueChange={setAmountDraft}
                                onBlur={() => commitCustomAmountDraft(row.id, column)}
                                allowCalculations
                                formulaVariables={formulaVariables}
                                decimalSeparator={decimalSeparator}
                                onCalculation={(nextValue, displayValue, nextExpression) => {
                                  setAmountDraft(displayValue);
                                  updateRow(row.id, {
                                    customValues: { ...row.customValues, [column]: nextValue },
                                    customExpressions: {
                                      ...row.customExpressions,
                                      [column]: /^[-+]?\d+(?:[.,]\d+)?$/.test(nextExpression.trim()) ? '' : nextExpression.trim(),
                                    },
                                  });
                                }}
                                onCommit={stopEdit}
                                onCancel={stopEdit}
                                size="small"
                                fullWidth
                                inputMode={formulaVariables.length > 0 ? 'text' : 'decimal'}
                                placeholder={dictionary.table.exampleFormula}
                                inputProps={{ style: getColumnTextStyle(columnSettings.cellStyle) }}
                                InputProps={{
                                  startAdornment: <InputAdornment position="start">{currencySymbol}</InputAdornment>,
                                }}
                                autoFocus
                                className="bf-registry-table__cell-input"
                              />
                            ) : (
                              <div
                                className={`bf-cell ${expression ? 'bf-cell--formula' : ''}`}
                                onClick={() => startCustomEdit(row, column, 'amount')}
                                style={getCellAlignmentStyle(columnSettings.cellStyle.align)}
                                title={expression ? `fx ${expression}` : undefined}
                              >
                                {expression ? <span className="bf-registry-table__formula-mark">fx</span> : null}
                                <Typography variant="body2" style={getColumnTextStyle(columnSettings.cellStyle)}>
                                  {numericValue === null ? (
                                    <span className="bf-cell__placeholder">{currencySymbol} 0</span>
                                  ) : (
                                    formatCurrency(numericValue, currency, decimalSeparator, activeLanguage.locale)
                                  )}
                                </Typography>
                              </div>
                            )}
                          </TableCell>
                        );
                      }

                      return (
                        <TableCell key={column} {...cellProps}>
                          <ComparisonCell
                            amount={row.amount}
                            prevAmount={previousAmount}
                            invert={invertComparison}
                            currency={currency}
                            decimalSeparator={decimalSeparator}
                            locale={activeLanguage.locale}
                            textStyle={getColumnTextStyle(columnSettings.cellStyle)}
                          />
                        </TableCell>
                      );
                    };

                    return (
                      <Fragment key={row.id}>
                        <Draggable draggableId={row.id} index={index}>
                          {(draggableProvided, draggableSnapshot) => (
                            <TableRow
                              ref={draggableProvided.innerRef}
                              {...draggableProvided.draggableProps}
                              sx={{
                                backgroundColor: draggableSnapshot.isDragging ? 'action.hover' : rowBg,
                              }}
                              className={isEditingRow ? 'bf-row--active' : undefined}
                            >
                              <TableCell
                                align="center"
                                className={`bf-registry-table__drag-column ${
                                  tableSettings.showIcons ? 'bf-registry-table__drag-column--with-icon' : ''
                                }`}
                              >
                                <div className="bf-registry-table__row-identity">
                                  <Tooltip title={dictionary.table.dragToReorder} enterDelay={250}>
                                    <span {...draggableProvided.dragHandleProps} className="bf-registry-table__drag-handle">
                                      <DragIndicatorRoundedIcon fontSize="small" />
                                    </span>
                                  </Tooltip>

                                  {tableSettings.showIcons ? (
                                    <Tooltip title={dictionary.table.customizeIcon} enterDelay={250}>
                                      <ButtonBase
                                        onClick={(event) => setRowEditor({ el: event.currentTarget, rowId: row.id })}
                                        className="bf-registry-table__icon-btn"
                                        sx={{
                                          backgroundColor: `${row.color}22`,
                                          border: `1px solid ${row.color}55`,
                                          color: row.color,
                                          '& svg': {
                                            color: row.color,
                                            fill: 'currentColor',
                                          },
                                        }}
                                      >
                                        {renderRowIcon(row)}
                                      </ButtonBase>
                                    </Tooltip>
                                  ) : null}
                                </div>
                              </TableCell>

                              {visibleColumnOrder.map(renderRowColumn)}

                              <TableCell align="center" className="bf-registry-table__actions">
                                <div className="bf-registry-table__actions-inner">
                                  <Box
                                    className="bf-registry-table__preview-wrap"
                                    onMouseEnter={() => setPreviewRowId(row.id)}
                                    onMouseLeave={() => setPreviewRowId((currentPreviewRowId) => (currentPreviewRowId === row.id ? null : currentPreviewRowId))}
                                  >
                                    <Tooltip title={dictionary.table.addRowBelow} enterDelay={250}>
                                      <IconButton size="small" onClick={() => insertRowAt(index + 1)} className="bf-icon-btn">
                                        <AddCircleOutlineIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  </Box>

                                  <Tooltip title={dictionary.table.repeatNextMonths} enterDelay={250}>
                                    <IconButton
                                      size="small"
                                      onClick={() => updateRow(row.id, { recurring: !row.recurring })}
                                      className="bf-icon-btn"
                                      sx={{
                                        color: row.recurring ? 'var(--bf-primary)' : 'text.secondary',
                                        opacity: 1,
                                        transition: 'transform 120ms var(--bf-ease), opacity 160ms ease, color 160ms ease',
                                        '&:hover': { opacity: 1, transform: 'translateY(-1px) scale(1.04)' },
                                      }}
                                    >
                                      <RepeatIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>

                                  <RowComment
                                    value={row.note}
                                    rowLabel={row.label}
                                    color={row.color}
                                    onSave={(nextValue) => updateRow(row.id, { note: nextValue })}
                                  />

                                  <Tooltip title={dictionary.table.deleteRow} enterDelay={250} onClose={() => {}}>
                                    <IconButton onClick={() => requestRemoveRow(row.id)} size="small" className="bf-icon-btn">
                                      <DeleteOutlineIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </Draggable>

                        <PreviewRow isOpen={previewRowId === row.id} />
                      </Fragment>
                    );
                  })}

                  {droppableProvided.placeholder}
                </TableBody>
              </Table>
            )}
          </Droppable>
        </DragDropContext>
      </TableContainer>

      <GenericPopup
        open={Boolean(rowPendingDelete)}
        title={dictionary.table.deleteRowTitle}
        description={`${dictionary.table.deleteRowPrefix} ${rowPendingDelete?.label?.trim() || dictionary.table.thisRow}.`}
        confirmLabel={dictionary.common.delete}
        cancelLabel={dictionary.common.cancel}
        variant="danger"
        onConfirm={confirmRemoveRow}
        onCancel={cancelRemoveRow}
      />

      <TextConfigurationPopup
        anchorEl={textConfig?.anchorEl ?? null}
        column={textConfig?.column ?? null}
        settings={textConfig ? tableSettings.columns[textConfig.column] : null}
        colorPresets={colorPresets}
        onChange={(columnSettings) => {
          if (!textConfig) return;
          updateColumnSettings(textConfig.column, columnSettings);
        }}
        onClose={() => setTextConfig(null)}
      />

      <Menu anchorEl={currencyAnchor} open={Boolean(currencyAnchor)} onClose={() => setCurrencyAnchor(null)}>
        {CURRENCIES.map((currencyOption) => (
          <MenuItem
            key={currencyOption.code}
            selected={currencyOption.code === currency}
            onClick={() => {
              setCurrency(currencyOption.code);
              setCurrencyAnchor(null);
            }}
          >
            {currencyOption.label}
          </MenuItem>
        ))}
      </Menu>

      <Menu anchorEl={decimalAnchor} open={Boolean(decimalAnchor)} onClose={() => setDecimalAnchor(null)}>
        <MenuItem
          selected={decimalSeparator === ','}
          onClick={() => {
            setDecimalSeparator(',');
            setDecimalAnchor(null);
          }}
        >
          {dictionary.table.decimalComma}
        </MenuItem>

        <MenuItem
          selected={decimalSeparator === '.'}
          onClick={() => {
            setDecimalSeparator('.');
            setDecimalAnchor(null);
          }}
        >
          {dictionary.table.decimalPoint}
        </MenuItem>
      </Menu>

      <IconSelectorMenu
        open={Boolean(rowEditor)}
        anchorEl={rowEditor?.el ?? null}
        onClose={() => setRowEditor(null)}
        row={rows.find((row) => row.id === rowEditor?.rowId) ?? null}
        categories={categories}
        onCreateCategory={(name) => createCategory(name)}
        icons={icons}
        colorPresets={colorPresets}
        onChange={(patch) => {
          if (!rowEditor) return;
          updateRow(rowEditor.rowId, patch);
        }}
        allowCustomImages
      />

      <Snackbar
        open={toast.open}
        autoHideDuration={2200}
        onClose={() => setToast((currentToast) => ({ ...currentToast, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert
          onClose={() => setToast((currentToast) => ({ ...currentToast, open: false }))}
          severity={toast.severity}
          variant="filled"
          className="bf-registry-table__toast"
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </section>
  );
};

export default RegistryTable;
