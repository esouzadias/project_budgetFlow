import { useMemo, useRef, useState } from 'react';
import {
  Box,
  ButtonBase,
  Card,
  CardContent,
  Chip,
  Collapse,
  Divider,
  IconButton,
  LinearProgress,
  Menu,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';

import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import FlagIcon from '@mui/icons-material/Flag';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';

import { COLOR_PRESETS, ICON_OPTIONS } from '../../components/IconSelectorMenu/IconSelectorMenu.db';
import type { IconId, IconOption } from '../../components/IconSelectorMenu/IconSelectorMenu.types';
import type { SavingItem, SavingsTransaction } from './Savings.type';

function createId() {
  return crypto.randomUUID();
}

function parseNumber(value: string) {
  const normalized = value.replace(',', '.').replace(/[^\d.-]/g, '').trim();
  if (!normalized || normalized === '-' || normalized === '.') return null;
  const num = Number(normalized);
  return Number.isFinite(num) ? num : null;
}

function formatMoney(v: number) {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v);
}

function clamp01(v: number) {
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

function getIcon(icons: IconOption[], id: IconId) {
  return icons.find((i) => i.id === id) ?? icons.find((i) => i.id === 'other') ?? icons[0];
}

function sumTransactions(txs: SavingsTransaction[]) {
  return txs.reduce((acc, t) => acc + t.amount, 0);
}

export default function Savings() {
  const icons = ICON_OPTIONS;
  const colorPresets = COLOR_PRESETS;
  const defaultColor = colorPresets[0] ?? '#1a73e8';

  const [items, setItems] = useState<SavingItem[]>([
    {
      id: createId(),
      name: 'Emergency Fund',
      iconId: 'savings',
      color: colorPresets[13] ?? '#34a853',
      goalAmount: 2000,
      transactions: [
        { id: createId(), amount: 150, note: 'Initial deposit', createdAt: Date.now() - 1000 * 60 * 60 * 24 * 14 },
        { id: createId(), amount: 50, note: 'Top up', createdAt: Date.now() - 1000 * 60 * 60 * 24 * 3 },
      ],
    },
    {
      id: createId(),
      name: 'Trip',
      iconId: 'travel',
      color: colorPresets[4] ?? '#a142f4',
      goalAmount: null,
      transactions: [{ id: createId(), amount: 120, note: 'Start', createdAt: Date.now() - 1000 * 60 * 60 * 24 * 5 }],
    },
  ]);

  const [editing, setEditing] = useState<{ id: string; field: 'name' | 'goal' } | null>(null);
  const nameFocusRef = useRef<HTMLInputElement | null>(null);

  const [editor, setEditor] = useState<{ anchorEl: HTMLElement; id: string } | null>(null);
  const selected = useMemo(() => items.find((x) => x.id === editor?.id) ?? null, [items, editor?.id]);

  const [iconAnchor, setIconAnchor] = useState<HTMLElement | null>(null);
  const [colorAnchor, setColorAnchor] = useState<HTMLElement | null>(null);

  const [previewSavingId, setPreviewSavingId] = useState<string | null>(null);

  const [previewTxSavingId, setPreviewTxSavingId] = useState<string | null>(null);

  const [editingTx, setEditingTx] = useState<
    | { savingId: string; txId: string; field: 'amount' | 'note' }
    | null
  >(null);
  const txFocusRef = useRef<HTMLInputElement | null>(null);

  const [txDraftById, setTxDraftById] = useState<Record<string, { amount: string; note: string }>>({});

  function getTxDraft(id: string) {
    return txDraftById[id] ?? { amount: '', note: '' };
  }

  function patchTxDraft(id: string, patch: Partial<{ amount: string; note: string }>) {
    setTxDraftById((prev) => {
      const current = prev[id] ?? { amount: '', note: '' };
      return { ...prev, [id]: { ...current, ...patch } };
    });
  }

  function startEdit(id: string, field: 'name' | 'goal') {
    setEditing({ id, field });
    if (field === 'name') {
      queueMicrotask(() => {
        nameFocusRef.current?.focus();
        nameFocusRef.current?.select();
      });
    }
  }

  function stopEdit() {
    setEditing(null);
  }

  function createEmptySaving(): SavingItem {
    return {
      id: createId(),
      name: '',
      iconId: 'savings',
      color: defaultColor,
      goalAmount: null,
      transactions: [],
    };
  }

  function addSaving() {
    const next = createEmptySaving();
    setItems((prev) => [next, ...prev]);
    startEdit(next.id, 'name');
  }

  function insertSavingAt(index: number) {
    const next = createEmptySaving();
    setItems((prev) => {
      const copy = [...prev];
      copy.splice(index, 0, next);
      return copy;
    });
    startEdit(next.id, 'name');
  }

  function removeSaving(id: string) {
    setItems((prev) => prev.filter((x) => x.id !== id));
    setTxDraftById((prev) => {
      if (!prev[id]) return prev;
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
    if (editor?.id === id) setEditor(null);
    if (editing?.id === id) setEditing(null);
  }

  function patchSaving(id: string, patch: Partial<SavingItem>) {
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }

  function addTransaction(id: string) {
    const draft = getTxDraft(id);
    const amount = parseNumber(draft.amount);
    if (amount === null) return;

    const note = draft.note.trim();
    const tx: SavingsTransaction = {
      id: createId(),
      amount,
      note,
      createdAt: Date.now(),
    };

    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, transactions: [tx, ...x.transactions] } : x)));
    patchTxDraft(id, { amount: '', note: '' });
  }

  function removeTransaction(savingId: string, txId: string) {
    setItems((prev) =>
      prev.map((x) => (x.id === savingId ? { ...x, transactions: x.transactions.filter((t) => t.id !== txId) } : x))
    );
  }

  function patchTransaction(savingId: string, txId: string, patch: Partial<SavingsTransaction>) {
    setItems((prev) =>
      prev.map((x) => {
        if (x.id !== savingId) return x;
        return {
          ...x,
          transactions: x.transactions.map((t) => (t.id === txId ? { ...t, ...patch } : t)),
        };
      })
    );
  }

  function startTxEdit(savingId: string, txId: string, field: 'amount' | 'note') {
    setEditingTx({ savingId, txId, field });
    queueMicrotask(() => {
      txFocusRef.current?.focus();
      txFocusRef.current?.select();
    });
  }

  function stopTxEdit() {
    setEditingTx(null);
  }

  return (
    <section>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 2, mb: 1 }}>
        <Box>
          <Typography variant="h5" fontWeight={800}>
            Savings
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Cria savings, define goal (opcional) e gere transações.
          </Typography>
        </Box>

        <Tooltip title="Add saving" enterDelay={250}>
          <IconButton className="bf-icon-btn" size="small" onClick={addSaving}>
            <AddCircleOutlineIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>

      <Stack spacing={1.25}>
        {items.map((s, index) => {
          const icon = getIcon(icons, s.iconId);
          const IconComp = icon.render;

          const total = sumTransactions(s.transactions);
          const hasGoal = typeof s.goalAmount === 'number' && s.goalAmount > 0;
          const progress = hasGoal ? clamp01(total / (s.goalAmount as number)) : 0;

          const isEditingName = editing?.id === s.id && editing.field === 'name';
          const isEditingGoal = editing?.id === s.id && editing.field === 'goal';

          const draft = getTxDraft(s.id);

          return (
            <Box key={s.id}>
              <Card variant="outlined" className="bf-bubble-surface">
                <CardContent sx={{ py: 1.25 }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0, flex: 1 }}>
                      <Box
                        component={ButtonBase}
                        onClick={(e) => setEditor({ anchorEl: e.currentTarget, id: s.id })}
                        sx={{
                          width: 34,
                          height: 34,
                          borderRadius: 999,
                          display: 'grid',
                          placeItems: 'center',
                          backgroundColor: `${s.color}22`,
                          border: `1px solid ${s.color}55`,
                          color: s.color,
                          flex: '0 0 auto',
                        }}
                      >
                        {IconComp({ fontSize: 'small' })}
                      </Box>

                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        {isEditingName ? (
                          <TextField
                            size="small"
                            value={s.name}
                            onChange={(e) => patchSaving(s.id, { name: e.target.value })}
                            onBlur={stopEdit}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === 'Escape') stopEdit();
                            }}
                            inputRef={(el) => {
                              nameFocusRef.current = el;
                            }}
                            autoFocus
                            fullWidth
                            placeholder="New saving"
                            sx={{
                              '& .MuiInputBase-root': { minHeight: 40, borderRadius: 'var(--bf-radius-md)' },
                              '& input': { paddingTop: 10, paddingBottom: 10 },
                            }}
                          />
                        ) : (
                          <Box
                            onClick={() => startEdit(s.id, 'name')}
                            sx={{
                              minWidth: 0,
                              cursor: 'text',
                              borderRadius: 2,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 0.75,
                              '&:hover .bf-edit-hint': { opacity: 1 },
                            }}
                          >
                            <div className="bf-cell" style={{ minWidth: 0 }}>
                              <Typography
                                fontWeight={900}
                                sx={{ lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis' }}
                              >
                                {(s.name || '').trim() ? s.name : <span className="bf-cell__placeholder">New saving</span>}
                              </Typography>
                            </div>

                            <EditIcon
                              className="bf-edit-hint"
                              fontSize="small"
                              sx={{
                                opacity: 0,
                                transition: 'opacity 120ms ease',
                                color: 'text.secondary',
                              }}
                            />
                          </Box>
                        )}

                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.25, flexWrap: 'wrap' }}>
                          {/* Progress/Total (não clicável) */}
                          <Chip
                            size="small"
                            label={
                              hasGoal
                                ? `Progress: ${formatMoney(total)} / ${formatMoney(s.goalAmount as number)}`
                                : `Total: ${formatMoney(total)}`
                            }
                            clickable={false}
                            sx={{ borderRadius: 999, fontWeight: 900, cursor: 'default' }}
                          />

                          {/* Goal: label não clicável + valor clicável/editável */}
                          {isEditingGoal ? (
                            <TextField
                              size="small"
                              value={s.goalAmount === null ? '' : String(s.goalAmount)}
                              onChange={(e) => {
                                const n = parseNumber(e.target.value);
                                patchSaving(s.id, { goalAmount: n === null ? null : Math.max(0, n) });
                              }}
                              onBlur={stopEdit}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === 'Escape') stopEdit();
                              }}
                              autoFocus
                              sx={{
                                width: 180,
                                '& .MuiInputBase-root': { minHeight: 36, borderRadius: 'var(--bf-radius-pill)' },
                              }}
                            />
                          ) : (
                            <Stack direction="row" spacing={0.75} alignItems="center">
                              <Chip
                                size="small"
                                icon={<FlagIcon />}
                                label="Goal"
                                clickable={false}
                                sx={{
                                  borderRadius: 999,
                                  fontWeight: 900,
                                  opacity: 0.85,
                                  cursor: 'default',
                                }}
                              />

                              <Box
                                onClick={() => startEdit(s.id, 'goal')}
                                sx={{
                                  cursor: 'text',
                                  borderRadius: 2,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 0.75,
                                  '&:hover .bf-edit-hint': { opacity: 1 },
                                }}
                              >
                                <div className="bf-cell">
                                  <Typography variant="body2" sx={{ fontWeight: 900 }}>
                                    {hasGoal ? formatMoney(s.goalAmount as number) : <span className="bf-cell__placeholder">No goal</span>}
                                  </Typography>
                                </div>

                                <EditIcon
                                  className="bf-edit-hint"
                                  fontSize="small"
                                  sx={{
                                    opacity: 0,
                                    transition: 'opacity 120ms ease',
                                    color: 'text.secondary',
                                  }}
                                />
                              </Box>
                            </Stack>
                          )}
                        </Stack>
                      </Box>
                    </Stack>

                    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flex: '0 0 auto' }}>
                      {/* Add below com preview */}
                      <Box
                        sx={{ display: 'inline-flex' }}
                        onMouseEnter={() => setPreviewSavingId(s.id)}
                        onMouseLeave={() => setPreviewSavingId((prev) => (prev === s.id ? null : prev))}
                      >
                        <Tooltip title="Add saving below" enterDelay={250}>
                          <IconButton className="bf-icon-btn" size="small" onClick={() => insertSavingAt(index + 1)}>
                            <AddCircleOutlineIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>

                      <Tooltip title="Delete" enterDelay={250}>
                        <IconButton className="bf-icon-btn" size="small" onClick={() => removeSaving(s.id)}>
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Stack>

                  <Box sx={{ mt: 1 }}>
                    {hasGoal ? (
                      <Stack spacing={0.5}>
                        <LinearProgress
                          variant="determinate"
                          value={progress * 100}
                          sx={{
                            height: 8,
                            borderRadius: 999,
                            backgroundColor: `${s.color}22`,
                            '& .MuiLinearProgress-bar': { backgroundColor: s.color },
                          }}
                        />
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="caption" color="text.secondary" fontWeight={800}>
                            {Math.round(progress * 100)}%
                          </Typography>
                          <Typography variant="caption" color="text.secondary" fontWeight={800}>
                            {formatMoney(Math.max(0, (s.goalAmount as number) - total))} left
                          </Typography>
                        </Stack>
                      </Stack>
                    ) : (
                      <Box sx={{ height: 8 }} />
                    )}
                  </Box>

                  <Divider sx={{ my: 1 }} />

                  <Stack direction="row" spacing={1} alignItems="center">
                    <TextField
                      size="small"
                      label="Amount"
                      value={draft.amount}
                      onChange={(e) => patchTxDraft(s.id, { amount: e.target.value })}
                      placeholder="Ex: 50"
                      sx={{ width: 160 }}
                    />
                    <TextField
                      size="small"
                      label="Note"
                      value={draft.note}
                      onChange={(e) => patchTxDraft(s.id, { note: e.target.value })}
                      placeholder="Optional"
                      fullWidth
                    />
                    <Box
                      sx={{ display: 'inline-flex' }}
                      onMouseEnter={() => setPreviewTxSavingId(s.id)}
                      onMouseLeave={() => setPreviewTxSavingId((prev) => (prev === s.id ? null : prev))}
                    >
                      <Tooltip title="Add transaction" enterDelay={250}>
                        <IconButton className="bf-icon-btn" size="small" onClick={() => addTransaction(s.id)}>
                          <AddCircleOutlineIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Stack>
                  <Box sx={{ mt: 0.75 }}>
                    <PreviewTxRow isOpen={previewTxSavingId === s.id} />
                  </Box>

                  {s.transactions.length > 0 ? (
                    <Stack spacing={0.75} sx={{ mt: 1 }}>
                      {s.transactions.slice(0, 6).map((t) => (
                        <Paper key={t.id} variant="outlined" sx={{ px: 1, py: 0.75, borderRadius: 2 }}>
                          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
                              {/* Amount */}
                              {editingTx?.savingId === s.id && editingTx.txId === t.id && editingTx.field === 'amount' ? (
                                <TextField
                                  size="small"
                                  value={String(t.amount)}
                                  onChange={(e) => {
                                    const n = parseNumber(e.target.value);
                                    if (n === null) return;
                                    patchTransaction(s.id, t.id, { amount: n });
                                  }}
                                  onBlur={stopTxEdit}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === 'Escape') stopTxEdit();
                                  }}
                                  inputRef={(el) => {
                                    txFocusRef.current = el;
                                  }}
                                  sx={{
                                    width: 140,
                                    '& .MuiInputBase-root': { minHeight: 34, borderRadius: 'var(--bf-radius-pill)' },
                                  }}
                                />
                              ) : (
                                <Box
                                  onClick={() => startTxEdit(s.id, t.id, 'amount')}
                                  sx={{
                                    cursor: 'text',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 0.5,
                                    '&:hover .bf-edit-hint': { opacity: 1 },
                                  }}
                                >
                                  <Typography fontWeight={900}>{formatMoney(t.amount)}</Typography>
                                  <EditIcon
                                    className="bf-edit-hint"
                                    fontSize="small"
                                    sx={{ opacity: 0, transition: 'opacity 120ms ease', color: 'text.secondary' }}
                                  />
                                </Box>
                              )}

                              {/* Note */}
                              {editingTx?.savingId === s.id && editingTx.txId === t.id && editingTx.field === 'note' ? (
                                <TextField
                                  size="small"
                                  value={t.note}
                                  onChange={(e) => patchTransaction(s.id, t.id, { note: e.target.value })}
                                  onBlur={stopTxEdit}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === 'Escape') stopTxEdit();
                                  }}
                                  inputRef={(el) => {
                                    txFocusRef.current = el;
                                  }}
                                  fullWidth
                                  sx={{
                                    '& .MuiInputBase-root': { minHeight: 34, borderRadius: 'var(--bf-radius-pill)' },
                                  }}
                                />
                              ) : (
                                <Box
                                  onClick={() => startTxEdit(s.id, t.id, 'note')}
                                  sx={{
                                    minWidth: 0,
                                    cursor: 'text',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 0.5,
                                    '&:hover .bf-edit-hint': { opacity: 1 },
                                  }}
                                >
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 420 }}
                                  >
                                    {t.note || '—'}
                                  </Typography>
                                  <EditIcon
                                    className="bf-edit-hint"
                                    fontSize="small"
                                    sx={{ opacity: 0, transition: 'opacity 120ms ease', color: 'text.secondary' }}
                                  />
                                </Box>
                              )}
                            </Stack>

                            <Tooltip title="Remove transaction" enterDelay={250}>
                              <IconButton className="bf-icon-btn" size="small" onClick={() => removeTransaction(s.id, t.id)}>
                                <RemoveCircleOutlineIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </Paper>
                      ))}

                      {s.transactions.length > 6 ? (
                        <Typography variant="caption" color="text.secondary" fontWeight={800} sx={{ opacity: 0.75 }}>
                          Showing latest 6 transactions…
                        </Typography>
                      ) : null}
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1, opacity: 0.8 }}>
                      No transactions yet.
                    </Typography>
                  )}
                </CardContent>
              </Card>

              <PreviewSavingBlock isOpen={previewSavingId === s.id} />
            </Box>
          );
        })}
      </Stack>

      <Menu
        anchorEl={editor?.anchorEl ?? null}
        open={Boolean(editor)}
        onClose={() => {
          setEditor(null);
          setIconAnchor(null);
          setColorAnchor(null);
        }}
        PaperProps={{ sx: { width: 360, borderRadius: 3, p: 0.75 } }}
      >
        {selected ? (
          <Box sx={{ px: 1, py: 0.75 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.75 }}>
              <Typography fontWeight={900}>Customize</Typography>
              <IconButton className="bf-icon-btn" size="small" onClick={() => setEditor(null)}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Stack>

            <Stack spacing={1}>
              <Stack direction="row" spacing={1} alignItems="center">
                <ButtonBase
                  onClick={(e) => setIconAnchor(e.currentTarget)}
                  className="bf-pill"
                  style={{ width: '100%', justifyContent: 'flex-start', display: 'flex', gap: 10, alignItems: 'center' }}
                >
                  <Box
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: 999,
                      display: 'grid',
                      placeItems: 'center',
                      backgroundColor: `${selected.color}22`,
                      border: `1px solid ${selected.color}55`,
                      color: selected.color,
                    }}
                  >
                    {getIcon(icons, selected.iconId).render({ fontSize: 'small' })}
                  </Box>
                  <Typography fontWeight={900}>Icon</Typography>
                </ButtonBase>

                <ButtonBase
                  onClick={(e) => setColorAnchor(e.currentTarget)}
                  className="bf-pill"
                  style={{ width: '100%', justifyContent: 'flex-start', display: 'flex', gap: 10, alignItems: 'center' }}
                >
                  <Box
                    sx={{
                      width: 18,
                      height: 18,
                      borderRadius: 999,
                      backgroundColor: selected.color,
                      border: '1px solid rgba(0,0,0,0.22)',
                    }}
                  />
                  <Typography fontWeight={900}>Color</Typography>
                </ButtonBase>
              </Stack>
            </Stack>

            <Menu
              anchorEl={iconAnchor}
              open={Boolean(iconAnchor)}
              onClose={() => setIconAnchor(null)}
              PaperProps={{ sx: { width: 360, borderRadius: 3, p: 0.75 } }}
            >
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 0.75 }}>
                {icons.map((ic) => {
                  const selectedIcon = ic.id === selected.iconId;
                  return (
                    <ButtonBase
                      key={ic.id}
                      onClick={() => patchSaving(selected.id, { iconId: ic.id })}
                      sx={{
                        height: 34,
                        borderRadius: 2,
                        display: 'grid',
                        placeItems: 'center',
                        border: selectedIcon ? '2px solid rgba(26,115,232,0.9)' : '1px solid rgba(0,0,0,0.12)',
                        backgroundColor: selectedIcon ? 'rgba(26,115,232,0.10)' : 'transparent',
                        color: selected.color,
                      }}
                    >
                      {ic.render({ fontSize: 'small' })}
                    </ButtonBase>
                  );
                })}
              </Box>
            </Menu>

            <Menu
              anchorEl={colorAnchor}
              open={Boolean(colorAnchor)}
              onClose={() => setColorAnchor(null)}
              PaperProps={{ sx: { width: 360, borderRadius: 3, p: 0.75 } }}
            >
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 0.75 }}>
                {colorPresets.map((c) => {
                  const selectedColor = c === selected.color;
                  return (
                    <ButtonBase
                      key={c}
                      onClick={() => patchSaving(selected.id, { color: c })}
                      sx={{
                        width: 18,
                        height: 18,
                        borderRadius: 999,
                        backgroundColor: c,
                        border: selectedColor ? '2px solid rgba(0,0,0,0.75)' : '1px solid rgba(0,0,0,0.18)',
                        boxShadow: selectedColor ? '0 0 0 3px rgba(26,115,232,0.18)' : 'none',
                        justifySelf: 'center',
                      }}
                    />
                  );
                })}
              </Box>
            </Menu>
          </Box>
        ) : (
          <MenuItem disabled>—</MenuItem>
        )}
      </Menu>
    </section>
  );
}

function PreviewSavingBlock({ isOpen }: { isOpen: boolean }) {
  return (
    <Collapse in={isOpen} timeout={200} unmountOnExit collapsedSize={0}>
      <Box sx={{ mt: 1.25 }}>
        <Paper
          variant="outlined"
          className="bf-bubble-surface"
          sx={{
            p: 1.25,
            borderRadius: 3,
            background: 'linear-gradient(to right, rgba(25,118,210,0), rgba(25,118,210,0.10))',
            overflow: 'hidden',
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <Box sx={{ width: 34, height: 34, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.10)' }} />
            <Box sx={{ flex: 1, display: 'flex', gap: 1, alignItems: 'center' }}>
              <Box sx={{ width: '34%', height: 18, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.10)' }} />
              <Box sx={{ width: '22%', height: 18, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.10)' }} />
              <Box sx={{ width: '18%', height: 18, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.10)' }} />
            </Box>
          </Stack>
          <Box sx={{ mt: 1 }}>
            <Box sx={{ height: 8, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.08)' }} />
          </Box>
        </Paper>
      </Box>
    </Collapse>
  );
}

function PreviewTxRow({ isOpen }: { isOpen: boolean }) {
  return (
    <Collapse in={isOpen} timeout={200} unmountOnExit collapsedSize={0}>
      <Box sx={{ mt: 1 }}>
        <Paper
          variant="outlined"
          className="bf-bubble-surface"
          sx={{
            px: 1,
            py: 0.9,
            borderRadius: 3,
            background: 'linear-gradient(to right, rgba(25,118,210,0), rgba(25,118,210,0.10))',
            overflow: 'hidden',
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
              <Box sx={{ width: 90, height: 18, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.10)' }} />
              <Box sx={{ flex: 1, height: 18, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.10)' }} />
            </Stack>
            <Box sx={{ width: 28, height: 28, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.10)' }} />
          </Stack>
        </Paper>
      </Box>
    </Collapse>
  );
}