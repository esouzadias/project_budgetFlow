import type { JSX } from 'react';
import './RegistryTable.style.less';

import { Fragment, useMemo, useRef, useState } from 'react'; import { Alert, Badge, Box, ButtonBase, ClickAwayListener, Collapse, IconButton, InputAdornment, Menu, MenuItem, Paper, Popover, Snackbar, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip, Typography, } from '@mui/material';

//Icons
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import RemoveIcon from '@mui/icons-material/Remove';
import EditNoteIcon from '@mui/icons-material/EditNote';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RepeatIcon from '@mui/icons-material/Repeat';
import IconSelectorMenu from '../IconSelectorMenu/IconSelectorMenu';

import { DragDropContext, Draggable, Droppable, type DropResult } from '@hello-pangea/dnd';
import TotalSumOverview from '../TotalSumOverview/TotalSumOverview';
import { ICON_OPTIONS, COLOR_PRESETS } from '../IconSelectorMenu/IconSelectorMenu.db';
import type { IconOption } from '../IconSelectorMenu/IconSelectorMenu.types';
import type { Category, CurrencyOption, DecimalSeparator, RegistryRow, ToastState, TotalStep, } from './RegistryTable.types';


type Props = {
  title: string;
  invertComparison?: boolean;
  icons?: IconOption[];
  colorPresets?: string[];
  rows: RegistryRow[];
  onChangeRows: (rows: RegistryRow[]) => void;
};

const CURRENCIES: CurrencyOption[] = [
  { code: 'EUR', label: 'EUR (€)' },
  { code: 'USD', label: 'USD ($)' },
  { code: 'GBP', label: 'GBP (£)' },
  { code: 'BRL', label: 'BRL (R$)' },
];
const PREVIEW_HEIGHT = 64;

const createId = () => crypto.randomUUID();

const getCurrencySymbol = (currency: CurrencyOption['code']) => {
  const parts = new Intl.NumberFormat('pt-PT', { style: 'currency', currency }).formatToParts(0);
  return parts.find((p) => p.type === 'currency')?.value ?? '';
};

const parseNumber = (value: string) => {
  const normalized = value.replace(',', '.').replace(/[^\d.-]/g, '').trim();
  if (normalized === '' || normalized === '-' || normalized === '.') return null;
  const num = Number(normalized);
  return Number.isFinite(num) ? num : null;
};

const toDisplayNumber = (value: number | null, separator: DecimalSeparator) => {
  if (value === null) return '';
  const raw = String(value);
  return separator === ',' ? raw.replace('.', ',') : raw.replace(',', '.');
};

const formatCurrency = (value: number, currency: CurrencyOption['code'], separator: DecimalSeparator) => {
  const formatted = new Intl.NumberFormat('pt-PT', {
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

const createEmptyRow = (defaultColor: string): RegistryRow => ({
  id: createId(),
  label: 'New',
  amount: null,
  prevAmount: null,
  note: '',
  iconId: 'other',
  color: defaultColor,
  categories: [],
  recurring: false,
});

const buildTotalSteps = (rows: RegistryRow[]): TotalStep[] => {
  let running = 0;
  return rows
    .filter((r) => typeof r.amount === 'number')
    .map((r) => {
      running += r.amount as number;
      return {
        id: r.id,
        label: (r.label || '').trim() || '—',
        value: r.amount as number,
        running,
      };
    });
};

const HeaderPillButton = ({ label, onClick, }: { label: string; onClick: (e: React.MouseEvent<HTMLElement>) => void; }) => (
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
}: {
  amount: number | null;
  prevAmount: number | null;
  invert: boolean;
  currency: CurrencyOption['code'];
  decimalSeparator: DecimalSeparator;
}) => {
  const meta = getComparison(amount, prevAmount, invert);

  if (meta.diff === null) {
    return (
      <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ color: 'text.primary' }}>
        <RemoveIcon fontSize="small" />
      </Stack>
    );
  }

  if (meta.state === 'up') {
    return (
      <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ color: 'success.main' }}>
        <ArrowUpwardIcon fontSize="small" />
        <Typography variant="body2">{formatCurrency(meta.diff, currency, decimalSeparator)}</Typography>
      </Stack>
    );
  }

  if (meta.state === 'down') {
    return (
      <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ color: 'error.main' }}>
        <ArrowDownwardIcon fontSize="small" />
        <Typography variant="body2">{formatCurrency(Math.abs(meta.diff), currency, decimalSeparator)}</Typography>
      </Stack>
    );
  }

  return (
    <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ color: 'text.primary' }}>
      <RemoveIcon fontSize="small" />
      <Typography variant="body2">{formatCurrency(0, currency, decimalSeparator)}</Typography>
    </Stack>
  );
};

const NoteCell = ({ value, onSave }: { value: string; onSave: (nextValue: string) => void }) => {
  const hasNote = value.trim().length > 0;
  const badgeCount = hasNote ? 1 : 0;
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const open = Boolean(anchorEl);

  const openPopover = (target: HTMLElement) => {
    setAnchorEl(target);
    setDraft(value);
    setIsEditing(false);
  };
  const closePopover = () => {
    setAnchorEl(null);
    setIsEditing(false);
    setDraft(value);
  };
  const startEdit = () => {
    setIsEditing(true);
    setDraft(value);
  };
  const cancelEdit = () => {
    setIsEditing(false);
    setDraft(value);
  };
  const confirmEdit = () => {
    onSave(draft.trim());
    setIsEditing(false);
    closePopover();
  };

  return (
    <ClickAwayListener onClickAway={() => (open ? closePopover() : undefined)}>
      <Box sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        <span>
          <Tooltip title="Adicionar Comentário" enterDelay={250} disableInteractive disableHoverListener={open} disableFocusListener={open} disableTouchListener={open} >
            <Badge badgeContent={badgeCount} color={hasNote ? 'primary' : 'default'}>
              <IconButton
                size="small"
                onClick={(e) => openPopover(e.currentTarget)}
                className="bf-icon-btn"
                sx={{
                  color: hasNote ? 'primary.main' : 'text.secondary',
                  opacity: hasNote ? 1 : 0.75,
                  transition: 'opacity 120ms ease, color 120ms ease',
                  '&:hover': { opacity: 1 },
                }}
              >
                <EditNoteIcon fontSize="small" />
              </IconButton>
            </Badge>
          </Tooltip>
        </span>

        <Popover open={open} anchorEl={anchorEl} onClose={closePopover} disableRestoreFocus anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} transformOrigin={{ vertical: 'top', horizontal: 'center' }} PaperProps={{ sx: { p: 1.25, width: 320, borderRadius: 12 } }} >
          {!isEditing ? (<Stack direction="row" spacing={1} alignItems="center"> <Box sx={{ flex: 1, minWidth: 0 }}> <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', opacity: hasNote ? 1 : 0.55, color: hasNote ? 'text.primary' : 'text.secondary', }} > {hasNote ? value : 'Sem Comentários'} </Typography> </Box> <IconButton size="small" onClick={startEdit} className="bf-icon-btn"> <EditIcon fontSize="small" /> </IconButton> </Stack>) : (
            <Stack spacing={1}>
              <TextField
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') confirmEdit();
                  if (e.key === 'Escape') cancelEdit();
                }}
                size="small"
                fullWidth
                autoFocus
                multiline
                minRows={2}
                className="bf-registry-table__cell-input bf-registry-table__cell-input--compact"
              />
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <IconButton size="small" onClick={confirmEdit} className="bf-icon-btn">
                  <CheckIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={cancelEdit} className="bf-icon-btn">
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Stack>
            </Stack>
          )}
        </Popover>
      </Box>
    </ClickAwayListener>
  );
};

const RegistryTable = ({ title, invertComparison = false, icons = ICON_OPTIONS, colorPresets = COLOR_PRESETS, rows, onChangeRows }: Props): JSX.Element => {
  const defaultRowColor = colorPresets[0] ?? '#1a73e8';
  const labelFocusRef = useRef<HTMLInputElement | null>(null);
  const [editing, setEditing] = useState<{ rowId: string; field: 'label' | 'amount' | 'prevAmount' } | null>(null);
  /* const [rows, setRows] = useState<RegistryRow[]>([
    {
      id: createId(),
      label: 'Paycheck',
      amount: 1200,
      prevAmount: 1150,
      note: '',
      iconId: 'work',
      color: defaultRowColor,
      categories: ['Salary'],
      recurring: false,
    },
    {
      id: createId(),
      label: 'Other',
      amount: 284.84,
      prevAmount: 320,
      note: '',
      iconId: 'other',
      color: colorPresets[13] ?? '#34a853',
      categories: ['Misc'],
      recurring: false,
    },
    {
      id: createId(),
      label: 'Leftover',
      amount: 55,
      prevAmount: null,
      note: '',
      iconId: 'home',
      color: colorPresets[4] ?? '#a142f4',
      categories: [],
      recurring: false,
    },
  ]); */
  const [currency, setCurrency] = useState<CurrencyOption['code']>('EUR');
  const [decimalSeparator, setDecimalSeparator] = useState<DecimalSeparator>(',');
  const [currencyAnchor, setCurrencyAnchor] = useState<HTMLElement | null>(null);
  const [decimalAnchor, setDecimalAnchor] = useState<HTMLElement | null>(null);

  const [rowEditor, setRowEditor] = useState<{ el: HTMLElement; rowId: string } | null>(null);
  const [previewRowId, setPreviewRowId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>({ open: false, message: '', severity: 'info' });

  const [categories, setCategories] = useState<Category[]>([
    { id: createId(), name: 'Salary', color: defaultRowColor },
    { id: createId(), name: 'Misc', color: colorPresets[13] ?? '#34a853' },
    { id: createId(), name: 'House', color: colorPresets[4] ?? '#a142f4' },
  ]);

  const currencySymbol = useMemo(() => getCurrencySymbol(currency), [currency]);
  const currencyLabel = useMemo(() => CURRENCIES.find((c) => c.code === currency)?.label ?? currency, [currency]);

  const totalSteps = useMemo(() => buildTotalSteps(rows), [rows]);
  const total = useMemo(() => (totalSteps.length ? totalSteps[totalSteps.length - 1].running : 0), [totalSteps]);

  const showToast = (message: string, severity: ToastState['severity'] = 'info') => {
    setToast({ open: true, message, severity });
  };

  const updateRow = (id: string, patch: Partial<RegistryRow>) => {
    onChangeRows(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };
  const startEdit = (rowId: string, field: 'label' | 'amount' | 'prevAmount') => {
    setEditing({ rowId, field });

    if (field === 'label') {
      queueMicrotask(() => {
        labelFocusRef.current?.focus();
        labelFocusRef.current?.select();
      });
    }
  };

  const stopEdit = () => {
    setEditing(null);
  };

  const insertRowAt = (index: number) => {
    const nextRow = createEmptyRow(defaultRowColor);
    const next = [...rows];
    next.splice(index, 0, nextRow);
    onChangeRows(next);

    setPreviewRowId(null);
    setEditing({ rowId: nextRow.id, field: 'label' });
    showToast('Linha adicionada', 'success');
  };

  const removeRow = (id: string) => {
    onChangeRows(rows.filter((r) => r.id !== id));
    showToast('Linha removida', 'info');
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
    const found = icons.find((i) => i.id === iconId);
    const fallback = icons.find((i) => i.id === 'other') ?? icons[0];
    return (found ?? fallback).render;
  };

  const createCategory = (name: string) => {
    const clean = name.trim();
    if (!clean) return;

    const exists = categories.some((c) => c.name.toLowerCase() === clean.toLowerCase());
    if (exists) return;

    const next: Category = {
      id: createId(),
      name: clean,
      color: colorPresets[categories.length % colorPresets.length] ?? defaultRowColor,
    };
    setCategories((prev) => [next, ...prev]);
  };

  return (
    <section className="bf-registry-table">
      <Stack direction="row" alignItems="center" justifyContent="space-between" className="bf-registry-table__header">
        <Box className="bf-registry-table__header-left">
          <Typography variant="h5" fontWeight={700}>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Adiciona/remove linhas, edita valores e arrasta para mudar a ordem.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} alignItems="center" className="bf-registry-table__header-right">
          <TotalSumOverview
            title="Soma"
            steps={totalSteps}
            total={total}
            formatValue={(v) => formatCurrency(v, currency, decimalSeparator)}
          />

          <Typography variant="body1" fontWeight={600}>
            Total: {formatCurrency(total, currency, decimalSeparator)}
          </Typography>
        </Stack>
      </Stack>

      <TableContainer component={Paper} variant="outlined" className="bf-bubble-surface bf-registry-table__surface">
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId={`${title}-table`}>
            {(droppableProvided) => (
              <Table ref={droppableProvided.innerRef} {...droppableProvided.droppableProps} size="small">
                <TableHead>
                  <TableRow>
                    <TableCell width={44} align="center" />
                    <TableCell width={52} align="center" />
                    <TableCell align="center">Descrição</TableCell>

                    <TableCell width={260} align="center">
                      <div className="bf-registry-table__header-pills">
                        <Typography variant="inherit">Este mês</Typography>

                        <Tooltip title={currencyLabel}>
                          <Box>
                            <HeaderPillButton
                              label={currencySymbol}
                              onClick={(e) => setCurrencyAnchor(e.currentTarget)}
                            />
                          </Box>
                        </Tooltip>

                        <Tooltip title="Separador decimal">
                          <Box>
                            <HeaderPillButton
                              label={decimalSeparator === ',' ? '1,23' : '1.23'}
                              onClick={(e) => setDecimalAnchor(e.currentTarget)}
                            />
                          </Box>
                        </Tooltip>
                      </div>
                    </TableCell>

                    <TableCell width={260} align="center">
                      <div className="bf-registry-table__header-pills">
                        <Typography variant="inherit">Mês anterior</Typography>

                        <Tooltip title={currencyLabel}>
                          <Box>
                            <HeaderPillButton
                              label={currencySymbol}
                              onClick={(e) => setCurrencyAnchor(e.currentTarget)}
                            />
                          </Box>
                        </Tooltip>

                        <Tooltip title="Separador decimal">
                          <Box>
                            <HeaderPillButton
                              label={decimalSeparator === ',' ? '1,23' : '1.23'}
                              onClick={(e) => setDecimalAnchor(e.currentTarget)}
                            />
                          </Box>
                        </Tooltip>
                      </div>
                    </TableCell>

                    <TableCell width={200} align="center">
                      Diferença
                    </TableCell>

                    <TableCell width={220} align="center" />
                  </TableRow>
                </TableHead>

                <TableBody>
                  {rows.map((row, index) => {
                    const IconComp = getIconRender(row.iconId);
                    const rowBg = row.recurring ? 'rgba(26,115,232,0.10)' : 'inherit';
                    const isEditingRow = editing?.rowId === row.id;

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
                              <TableCell align="center">
                                <Tooltip title="Arrastar para reordenar" enterDelay={250}>
                                  <span {...draggableProvided.dragHandleProps} className="bf-registry-table__drag-handle">
                                    <DragIndicatorIcon fontSize="small" />
                                  </span>
                                </Tooltip>
                              </TableCell>

                              <TableCell align="center">
                                <Tooltip title="Customizar" enterDelay={250}>
                                  <ButtonBase
                                    onClick={(e) => setRowEditor({ el: e.currentTarget, rowId: row.id })}
                                    className="bf-registry-table__icon-btn"
                                    sx={{
                                      backgroundColor: `${row.color}22`,
                                      border: `1px solid ${row.color}55`,
                                      color: row.color,
                                    }}
                                  >
                                    {IconComp({ fontSize: 'small' })}
                                  </ButtonBase>
                                </Tooltip>
                              </TableCell>

                              <TableCell align="center">
                                {isEditingRow && editing?.field === 'label' ? (
                                  <TextField
                                    value={row.label}
                                    onChange={(e) => updateRow(row.id, { label: e.target.value })}
                                    onBlur={stopEdit}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' || e.key === 'Escape') stopEdit();
                                    }}
                                    size="small"
                                    fullWidth
                                    placeholder="Ex: Paycheck"
                                    inputProps={{ style: { textAlign: 'left' } }}
                                    inputRef={(el) => {
                                      labelFocusRef.current = el;
                                    }}
                                    autoFocus
                                    className="bf-registry-table__cell-input"
                                  />
                                ) : (
                                  <div className="bf-cell" onClick={() => startEdit(row.id, 'label')}>
                                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                      {(row.label || '').trim() ? (
                                        row.label
                                      ) : (
                                        <span className="bf-cell__placeholder">Ex: Paycheck</span>
                                      )}
                                    </Typography>
                                  </div>
                                )}
                              </TableCell>

                              <TableCell align="center">
                                {isEditingRow && editing?.field === 'amount' ? (
                                  <TextField
                                    value={toDisplayNumber(row.amount, decimalSeparator)}
                                    onChange={(e) => updateRow(row.id, { amount: parseNumber(e.target.value) })}
                                    onBlur={stopEdit}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' || e.key === 'Escape') stopEdit();
                                    }}
                                    size="small"
                                    fullWidth
                                    inputMode="decimal"
                                    inputProps={{ style: { textAlign: 'left' } }}
                                    InputProps={{
                                      startAdornment: <InputAdornment position="start">{currencySymbol}</InputAdornment>,
                                    }}
                                    autoFocus
                                    className="bf-registry-table__cell-input"
                                  />
                                ) : (
                                  <div className="bf-cell" onClick={() => startEdit(row.id, 'amount')}>
                                    <Typography variant="body2" sx={{ fontWeight: 800 }}>
                                      {row.amount === null ? (
                                        <span className="bf-cell__placeholder">{currencySymbol} 0</span>
                                      ) : (
                                        formatCurrency(row.amount, currency, decimalSeparator)
                                      )}
                                    </Typography>
                                  </div>
                                )}
                              </TableCell>

                              <TableCell align="center">
                                {isEditingRow && editing?.field === 'prevAmount' ? (
                                  <TextField
                                    value={toDisplayNumber(row.prevAmount, decimalSeparator)}
                                    onChange={(e) => updateRow(row.id, { prevAmount: parseNumber(e.target.value) })}
                                    onBlur={stopEdit}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' || e.key === 'Escape') stopEdit();
                                    }}
                                    size="small"
                                    fullWidth
                                    inputMode="decimal"
                                    inputProps={{ style: { textAlign: 'left' } }}
                                    InputProps={{
                                      startAdornment: <InputAdornment position="start">{currencySymbol}</InputAdornment>,
                                    }}
                                    autoFocus
                                    className="bf-registry-table__cell-input"
                                  />
                                ) : (
                                  <div className="bf-cell" onClick={() => startEdit(row.id, 'prevAmount')}>
                                    <Typography variant="body2" sx={{ fontWeight: 800 }}>
                                      {row.prevAmount === null ? (
                                        <span className="bf-cell__placeholder">{currencySymbol} 0</span>
                                      ) : (
                                        formatCurrency(row.prevAmount, currency, decimalSeparator)
                                      )}
                                    </Typography>
                                  </div>
                                )}
                              </TableCell>

                              <TableCell align="center">
                                <ComparisonCell
                                  amount={row.amount}
                                  prevAmount={row.prevAmount}
                                  invert={invertComparison}
                                  currency={currency}
                                  decimalSeparator={decimalSeparator}
                                />
                              </TableCell>

                              <TableCell align="center" className="bf-registry-table__actions">
                                <div className="bf-registry-table__actions-inner">
                                  <Box
                                    className="bf-registry-table__preview-wrap"
                                    onMouseEnter={() => setPreviewRowId(row.id)}
                                    onMouseLeave={() => setPreviewRowId((prev) => (prev === row.id ? null : prev))}
                                  >
                                    <Tooltip title="Adicionar nova linha abaixo" enterDelay={250}>
                                      <IconButton
                                        size="small"
                                        onClick={() => insertRowAt(index + 1)}
                                        className="bf-icon-btn"
                                      >
                                        <AddCircleOutlineIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  </Box>

                                  <Tooltip title="Repetir nos próximos meses" enterDelay={250}>
                                    <IconButton
                                      size="small"
                                      onClick={() => updateRow(row.id, { recurring: !row.recurring })}
                                      className="bf-icon-btn"
                                      sx={{
                                        color: row.recurring ? row.color : 'text.secondary',
                                        opacity: row.recurring ? 1 : 0.85,
                                        transition: 'opacity 160ms ease, color 160ms ease',
                                        '&:hover': { opacity: 1 },
                                      }}
                                    >
                                      <RepeatIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>

                                  <NoteCell value={row.note} onSave={(nextValue) => updateRow(row.id, { note: nextValue })} />

                                  <Tooltip title="Apagar linha" enterDelay={250}>
                                    <IconButton onClick={() => removeRow(row.id)} size="small" className="bf-icon-btn">
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

      <Menu anchorEl={currencyAnchor} open={Boolean(currencyAnchor)} onClose={() => setCurrencyAnchor(null)}>
        {CURRENCIES.map((c) => (
          <MenuItem
            key={c.code}
            selected={c.code === currency}
            onClick={() => {
              setCurrency(c.code);
              setCurrencyAnchor(null);
            }}
          >
            {c.label}
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
          Vírgula (1,23)
        </MenuItem>
        <MenuItem
          selected={decimalSeparator === '.'}
          onClick={() => {
            setDecimalSeparator('.');
            setDecimalAnchor(null);
          }}
        >
          Ponto (1.23)
        </MenuItem>
      </Menu>

      <IconSelectorMenu
        open={Boolean(rowEditor)}
        anchorEl={rowEditor?.el ?? null}
        onClose={() => setRowEditor(null)}
        row={rows.find((r) => r.id === rowEditor?.rowId) ?? null}
        categories={categories}
        onCreateCategory={(name) => createCategory(name)}
        icons={icons}
        colorPresets={colorPresets}
        onChange={(patch) => {
          if (!rowEditor) return;
          updateRow(rowEditor.rowId, patch);
        }}
      />

      <Snackbar
        open={toast.open}
        autoHideDuration={2200}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert
          onClose={() => setToast((t) => ({ ...t, open: false }))}
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