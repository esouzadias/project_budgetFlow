import { useMemo, useRef, useState } from "react";
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
} from "@mui/material";

import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import FlagIcon from "@mui/icons-material/Flag";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";

import { COLOR_PRESETS, ICON_OPTIONS } from "../../components/IconSelectorMenu/IconSelectorMenu.db";
import type { IconId, IconOption } from "../../components/IconSelectorMenu/IconSelectorMenu.types";
import type { SavingItem, SavingsTransaction } from "./Savings.type";

import "./Savings.style.less";

type Props = {
  items: SavingItem[];
  onChange: (items: SavingItem[]) => void;
};

type EditingSaving = { id: string; field: "name" | "goal" } | null;
type EditingTx = { savingId: string; txId: string; field: "amount" | "note" } | null;

const createId = () => crypto.randomUUID();

const parseNumber = (value: string) => {
  const normalized = value.replace(",", ".").replace(/[^\d.-]/g, "").trim();
  if (!normalized || normalized === "-" || normalized === ".") return null;
  const num = Number(normalized);
  return Number.isFinite(num) ? num : null;
};

const formatMoney = (v: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(v);

const clamp01 = (v: number) => {
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
};

const getIcon = (icons: IconOption[], id: IconId) =>
  icons.find((i) => i.id === id) ?? icons.find((i) => i.id === "other") ?? icons[0];

const sumTransactions = (txs: SavingsTransaction[]) => txs.reduce((acc, t) => acc + t.amount, 0);

const PreviewSavingBlock = ({ isOpen }: { isOpen: boolean }) => (
  <Collapse in={isOpen} timeout={200} unmountOnExit collapsedSize={0}>
    <Box className="bf-savings__preview-saving">
      <Paper variant="outlined" className="bf-bubble-surface bf-savings__preview-surface">
        <Stack direction="row" spacing={1} alignItems="center">
          <Box className="bf-savings__preview-icon" />
          <Box className="bf-savings__preview-lines">
            <Box className="bf-savings__preview-line bf-savings__preview-line--lg" />
            <Box className="bf-savings__preview-line bf-savings__preview-line--md" />
            <Box className="bf-savings__preview-line bf-savings__preview-line--sm" />
          </Box>
        </Stack>
        <Box className="bf-savings__preview-bar" />
      </Paper>
    </Box>
  </Collapse>
);

const PreviewTxRow = ({ isOpen }: { isOpen: boolean }) => (
  <Collapse in={isOpen} timeout={200} unmountOnExit collapsedSize={0}>
    <Box className="bf-savings__preview-tx">
      <Paper
        variant="outlined"
        className="bf-bubble-surface bf-savings__preview-surface bf-savings__preview-surface--tx"
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
          <Stack direction="row" spacing={1} alignItems="center" className="bf-savings__preview-tx-left">
            <Box className="bf-savings__preview-line bf-savings__preview-line--amount" />
            <Box className="bf-savings__preview-line bf-savings__preview-line--note" />
          </Stack>
          <Box className="bf-savings__preview-dot" />
        </Stack>
      </Paper>
    </Box>
  </Collapse>
);

const Savings = ({ items, onChange }: Props) => {
  const icons = ICON_OPTIONS;
  const colorPresets = COLOR_PRESETS;
  const defaultColor = colorPresets[0] ?? "#1a73e8";

  const [editing, setEditing] = useState<EditingSaving>(null);
  const nameFocusRef = useRef<HTMLInputElement | null>(null);

  const [editor, setEditor] = useState<{ anchorEl: HTMLElement; id: string } | null>(null);
  const selected = useMemo(() => items.find((x) => x.id === editor?.id) ?? null, [items, editor?.id]);

  const [iconAnchor, setIconAnchor] = useState<HTMLElement | null>(null);
  const [colorAnchor, setColorAnchor] = useState<HTMLElement | null>(null);

  const [previewSavingId, setPreviewSavingId] = useState<string | null>(null);
  const [previewTxSavingId, setPreviewTxSavingId] = useState<string | null>(null);

  const [editingTx, setEditingTx] = useState<EditingTx>(null);
  const txFocusRef = useRef<HTMLInputElement | null>(null);

  const [txDraftById, setTxDraftById] = useState<Record<string, { amount: string; note: string }>>({});

  const getTxDraft = (id: string) => txDraftById[id] ?? { amount: "", note: "" };

  const patchTxDraft = (id: string, patch: Partial<{ amount: string; note: string }>) => {
    setTxDraftById((prev) => {
      const current = prev[id] ?? { amount: "", note: "" };
      return { ...prev, [id]: { ...current, ...patch } };
    });
  };

  const startEdit = (id: string, field: "name" | "goal") => {
    setEditing({ id, field });
    if (field === "name") {
      queueMicrotask(() => {
        nameFocusRef.current?.focus();
        nameFocusRef.current?.select();
      });
    }
  };

  const stopEdit = () => setEditing(null);

  const createEmptySaving = (): SavingItem => ({
    id: createId(),
    name: "",
    iconId: "savings",
    color: defaultColor,
    goalAmount: null,
    transactions: [],
  });

  const patchSaving = (id: string, patch: Partial<SavingItem>) => {
    onChange(items.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  };

  const addSaving = () => {
    const next = createEmptySaving();
    onChange([next, ...items]);
    startEdit(next.id, "name");
  };

  const insertSavingAt = (index: number) => {
    const next = createEmptySaving();
    const copy = [...items];
    copy.splice(index, 0, next);
    onChange(copy);
    startEdit(next.id, "name");
  };

  const removeSaving = (id: string) => {
    onChange(items.filter((x) => x.id !== id));

    setTxDraftById((prev) => {
      if (!prev[id]) return prev;
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });

    if (editor?.id === id) setEditor(null);
    if (editing?.id === id) setEditing(null);
    if (editingTx?.savingId === id) setEditingTx(null);
    if (previewSavingId === id) setPreviewSavingId(null);
    if (previewTxSavingId === id) setPreviewTxSavingId(null);
  };

  const addTransaction = (savingId: string) => {
    const draft = getTxDraft(savingId);
    const amount = parseNumber(draft.amount);
    if (amount === null) return;

    const note = draft.note.trim();
    const tx: SavingsTransaction = { id: createId(), amount, note, createdAt: Date.now() };

    onChange(
      items.map((x) => (x.id === savingId ? { ...x, transactions: [tx, ...x.transactions] } : x)),
    );
    patchTxDraft(savingId, { amount: "", note: "" });
  };

  const removeTransaction = (savingId: string, txId: string) => {
    onChange(
      items.map((x) =>
        x.id === savingId ? { ...x, transactions: x.transactions.filter((t) => t.id !== txId) } : x,
      ),
    );
  };

  const patchTransaction = (savingId: string, txId: string, patch: Partial<SavingsTransaction>) => {
    onChange(
      items.map((x) => {
        if (x.id !== savingId) return x;
        return { ...x, transactions: x.transactions.map((t) => (t.id === txId ? { ...t, ...patch } : t)) };
      }),
    );
  };

  const startTxEdit = (savingId: string, txId: string, field: "amount" | "note") => {
    setEditingTx({ savingId, txId, field });
    queueMicrotask(() => {
      txFocusRef.current?.focus();
      txFocusRef.current?.select();
    });
  };

  const stopTxEdit = () => setEditingTx(null);

  return (
    <section id="bf-savings">
      <div id="bf-savings__container">
        <div id="bf-savings__header">
          <div id="bf-savings__header-left">
            <Typography variant="h5" fontWeight={800}>
              Savings
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Cria savings, define goal (opcional) e gere transações.
            </Typography>
          </div>
          <Tooltip title="Add saving" enterDelay={250}>
            <IconButton className="bf-icon-btn" size="small" onClick={addSaving}>
              <AddCircleOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </div>

        <div id="bf-savings__grid">
          {items.map((s: SavingItem, index: number) => {
            const icon = getIcon(icons, s.iconId);
            const IconComp = icon.render;

            const total = sumTransactions(s.transactions);
            const hasGoal = typeof s.goalAmount === "number" && s.goalAmount > 0;
            const progress = hasGoal ? clamp01(total / (s.goalAmount as number)) : 0;

            const isEditingName = editing?.id === s.id && editing.field === "name";
            const isEditingGoal = editing?.id === s.id && editing.field === "goal";

            const draft = getTxDraft(s.id);

            return (
              <div className="bf-savings__grid-item" key={s.id}>
                <Card variant="outlined" className="bf-bubble-surface">
                  <CardContent className="bf-savings__card">
                    <div className="bf-savings__top">
                      <div className="bf-savings__top-left">
                        <ButtonBase
                          className="bf-savings__icon"
                          onClick={(e) => setEditor({ anchorEl: e.currentTarget, id: s.id })}
                          style={{ ["--bf-saving-color" as any]: s.color }}
                        >
                          {IconComp({ fontSize: "small" })}
                        </ButtonBase>

                        <div className="bf-savings__meta">
                          {isEditingName ? (
                            <TextField
                              size="small"
                              value={s.name}
                              onChange={(e) => patchSaving(s.id, { name: e.target.value })}
                              onBlur={stopEdit}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === "Escape") stopEdit();
                              }}
                              inputRef={(el) => {
                                nameFocusRef.current = el;
                              }}
                              autoFocus
                              fullWidth
                              placeholder="New saving"
                              className="bf-savings__name-input"
                            />
                          ) : (
                            <div className="bf-savings__editable" onClick={() => startEdit(s.id, "name")}>
                              <div className="bf-cell bf-savings__cell">
                                <Typography className="bf-savings__name">
                                  {(s.name || "").trim() ? s.name : <span className="bf-cell__placeholder">New saving</span>}
                                </Typography>
                              </div>
                              <EditIcon className="bf-edit-hint bf-savings__edit-icon" fontSize="small" />
                            </div>
                          )}

                          <div className="bf-savings__chips">
                            <Chip
                              size="small"
                              label={
                                hasGoal
                                  ? `Progress: ${formatMoney(total)} / ${formatMoney(s.goalAmount as number)}`
                                  : `Total: ${formatMoney(total)}`
                              }
                              clickable={false}
                              className="bf-savings__chip"
                            />

                            {isEditingGoal ? (
                              <TextField
                                size="small"
                                value={s.goalAmount === null ? "" : String(s.goalAmount)}
                                onChange={(e) => {
                                  const n = parseNumber(e.target.value);
                                  patchSaving(s.id, { goalAmount: n === null ? null : Math.max(0, n) });
                                }}
                                onBlur={stopEdit}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === "Escape") stopEdit();
                                }}
                                autoFocus
                                className="bf-savings__goal-input"
                              />
                            ) : (
                              <div className="bf-savings__goal">
                                <Chip
                                  size="small"
                                  icon={<FlagIcon />}
                                  label="Goal"
                                  clickable={false}
                                  className="bf-savings__chip bf-savings__chip--goal"
                                />

                                <div className="bf-savings__editable" onClick={() => startEdit(s.id, "goal")}>
                                  <div className="bf-cell bf-savings__cell">
                                    <Typography className="bf-savings__goal-value">
                                      {hasGoal ? (
                                        formatMoney(s.goalAmount as number)
                                      ) : (
                                        <span className="bf-cell__placeholder">No goal</span>
                                      )}
                                    </Typography>
                                  </div>
                                  <EditIcon className="bf-edit-hint bf-savings__edit-icon" fontSize="small" />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="bf-savings__top-right">
                        <div
                          className="bf-savings__preview-wrap"
                          onMouseEnter={() => setPreviewSavingId(s.id)}
                          onMouseLeave={() => setPreviewSavingId((prev) => (prev === s.id ? null : prev))}
                        >
                          <Tooltip title="Add saving below" enterDelay={250}>
                            <IconButton className="bf-icon-btn" size="small" onClick={() => insertSavingAt(index + 1)}>
                              <AddCircleOutlineIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </div>

                        <Tooltip title="Delete" enterDelay={250}>
                          <IconButton className="bf-icon-btn" size="small" onClick={() => removeSaving(s.id)}>
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </div>
                    </div>

                    <div className="bf-savings__progress">
                      {hasGoal ? (
                        <div className="bf-savings__progress-inner">
                          <LinearProgress
                            variant="determinate"
                            value={progress * 100}
                            sx={{
                              height: 8,
                              borderRadius: 999,
                              backgroundColor: `${s.color}22`,
                              "& .MuiLinearProgress-bar": { backgroundColor: s.color },
                            }}
                          />
                          <div className="bf-savings__progress-meta">
                            <Typography variant="caption" color="text.secondary" fontWeight={800}>
                              {Math.round(progress * 100)}%
                            </Typography>
                            <Typography variant="caption" color="text.secondary" fontWeight={800}>
                              {formatMoney(Math.max(0, (s.goalAmount as number) - total))} left
                            </Typography>
                          </div>
                        </div>
                      ) : (
                        <div className="bf-savings__progress-spacer" />
                      )}
                    </div>

                    <Divider className="bf-savings__divider" />

                    <div className="bf-savings__tx-add">
                      <TextField
                        size="small"
                        label="Amount"
                        value={draft.amount}
                        onChange={(e) => patchTxDraft(s.id, { amount: e.target.value })}
                        placeholder="Ex: 50"
                        className="bf-savings__tx-amount"
                      />
                      <TextField
                        size="small"
                        label="Note"
                        value={draft.note}
                        onChange={(e) => patchTxDraft(s.id, { note: e.target.value })}
                        placeholder="Optional"
                        fullWidth
                        className="bf-savings__tx-note"
                      />
                      <div
                        className="bf-savings__preview-wrap"
                        onMouseEnter={() => setPreviewTxSavingId(s.id)}
                        onMouseLeave={() => setPreviewTxSavingId((prev) => (prev === s.id ? null : prev))}
                      >
                        <Tooltip title="Add transaction" enterDelay={250}>
                          <IconButton className="bf-icon-btn" size="small" onClick={() => addTransaction(s.id)}>
                            <AddCircleOutlineIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </div>
                    </div>

                    <div className="bf-savings__tx-preview">
                      <PreviewTxRow isOpen={previewTxSavingId === s.id} />
                    </div>

                    {s.transactions.length > 0 ? (
                      <div className="bf-savings__tx-list">
                        {s.transactions.slice(0, 6).map((t: SavingsTransaction) => (
                          <Paper key={t.id} variant="outlined" className="bf-savings__tx-row">
                            <div className="bf-savings__tx-row-inner">
                              <div className="bf-savings__tx-row-left">
                                {editingTx?.savingId === s.id && editingTx.txId === t.id && editingTx.field === "amount" ? (
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
                                      if (e.key === "Enter" || e.key === "Escape") stopTxEdit();
                                    }}
                                    inputRef={(el) => {
                                      txFocusRef.current = el;
                                    }}
                                    className="bf-savings__tx-edit bf-savings__tx-edit--amount"
                                  />
                                ) : (
                                  <div className="bf-savings__editable" onClick={() => startTxEdit(s.id, t.id, "amount")}>
                                    <Typography className="bf-savings__tx-amount-text">{formatMoney(t.amount)}</Typography>
                                    <EditIcon className="bf-edit-hint bf-savings__edit-icon" fontSize="small" />
                                  </div>
                                )}

                                {editingTx?.savingId === s.id && editingTx.txId === t.id && editingTx.field === "note" ? (
                                  <TextField
                                    size="small"
                                    value={t.note}
                                    onChange={(e) => patchTransaction(s.id, t.id, { note: e.target.value })}
                                    onBlur={stopTxEdit}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" || e.key === "Escape") stopTxEdit();
                                    }}
                                    inputRef={(el) => {
                                      txFocusRef.current = el;
                                    }}
                                    fullWidth
                                    className="bf-savings__tx-edit bf-savings__tx-edit--note"
                                  />
                                ) : (
                                  <div
                                    className="bf-savings__editable bf-savings__editable--note"
                                    onClick={() => startTxEdit(s.id, t.id, "note")}
                                  >
                                    <Typography className="bf-savings__tx-note-text">{t.note || "—"}</Typography>
                                    <EditIcon className="bf-edit-hint bf-savings__edit-icon" fontSize="small" />
                                  </div>
                                )}
                              </div>

                              <Tooltip title="Remove transaction" enterDelay={250}>
                                <IconButton className="bf-icon-btn" size="small" onClick={() => removeTransaction(s.id, t.id)}>
                                  <RemoveCircleOutlineIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </div>
                          </Paper>
                        ))}

                        {s.transactions.length > 6 ? (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            fontWeight={800}
                            className="bf-savings__tx-more"
                          >
                            Showing latest 6 transactions…
                          </Typography>
                        ) : null}
                      </div>
                    ) : (
                      <Typography variant="body2" color="text.secondary" className="bf-savings__empty">
                        No transactions yet.
                      </Typography>
                    )}
                  </CardContent>
                </Card>

                <PreviewSavingBlock isOpen={previewSavingId === s.id} />
              </div>
            );
          })}

          <div className="bf-savings__grid-item">
            <ButtonBase id="bf-savings__add" className="bf-bubble-surface" onClick={addSaving} focusRipple>
              <div className="bf-savings__add-center">
                <AddCircleOutlineIcon fontSize="small" />
              </div>
              <div className="bf-savings__add-lines">
                <div className="bf-savings__add-line bf-savings__add-line--lg" />
                <div className="bf-savings__add-line bf-savings__add-line--md" />
                <div className="bf-savings__add-line bf-savings__add-line--sm" />
              </div>
            </ButtonBase>
          </div>
        </div>
      </div>

      <Menu
        anchorEl={editor?.anchorEl ?? null}
        open={Boolean(editor)}
        onClose={() => {
          setEditor(null);
          setIconAnchor(null);
          setColorAnchor(null);
        }}
        PaperProps={{ sx: { width: 360, borderRadius: 12, p: 0.75 } }}
      >
        {selected ? (
          <Box className="bf-savings__menu">
            <div className="bf-savings__menu-head">
              <Typography fontWeight={900}>Customize</Typography>
              <IconButton className="bf-icon-btn" size="small" onClick={() => setEditor(null)}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </div>

            <div className="bf-savings__menu-actions">
              <ButtonBase onClick={(e) => setIconAnchor(e.currentTarget)} className="bf-pill bf-savings__menu-action">
                <Box className="bf-savings__menu-icon" style={{ ["--bf-saving-color" as any]: selected.color }}>
                  {getIcon(icons, selected.iconId).render({ fontSize: "small" })}
                </Box>
                <Typography fontWeight={900}>Icon</Typography>
              </ButtonBase>

              <ButtonBase onClick={(e) => setColorAnchor(e.currentTarget)} className="bf-pill bf-savings__menu-action">
                <Box className="bf-savings__menu-color" style={{ backgroundColor: selected.color }} />
                <Typography fontWeight={900}>Color</Typography>
              </ButtonBase>
            </div>

            <Menu
              anchorEl={iconAnchor}
              open={Boolean(iconAnchor)}
              onClose={() => setIconAnchor(null)}
              PaperProps={{ sx: { width: 360, borderRadius: 12, p: 0.75 } }}
            >
              <Box className="bf-savings__icons-grid">
                {icons.map((ic) => {
                  const isSelected = ic.id === selected.iconId;
                  return (
                    <ButtonBase
                      key={ic.id}
                      onClick={() => patchSaving(selected.id, { iconId: ic.id })}
                      className={`bf-savings__icons-item ${isSelected ? "bf-savings__icons-item--active" : ""}`}
                      style={{
                        color: selected.color,
                        border: isSelected ? "2px solid rgba(26,115,232,0.9)" : "1px solid rgba(0,0,0,0.12)",
                        backgroundColor: isSelected ? "rgba(26,115,232,0.10)" : "transparent",
                      }}
                    >
                      {ic.render({ fontSize: "small" })}
                    </ButtonBase>
                  );
                })}
              </Box>
            </Menu>

            <Menu
              anchorEl={colorAnchor}
              open={Boolean(colorAnchor)}
              onClose={() => setColorAnchor(null)}
              PaperProps={{ sx: { width: 360, borderRadius: 12, p: 0.75 } }}
            >
              <Box className="bf-savings__colors-grid">
                {colorPresets.map((c) => {
                  const isSelected = c === selected.color;
                  return (
                    <ButtonBase
                      key={c}
                      onClick={() => patchSaving(selected.id, { color: c })}
                      className={`bf-savings__color-dot ${isSelected ? "bf-savings__color-dot--active" : ""}`}
                      style={{
                        backgroundColor: c,
                        border: isSelected ? "2px solid rgba(0,0,0,0.75)" : "1px solid rgba(0,0,0,0.18)",
                        boxShadow: isSelected ? "0 0 0 3px rgba(26,115,232,0.18)" : "none",
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
};

export default Savings;