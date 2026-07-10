import { useMemo, useRef, useState } from "react";
import {
  ButtonBase,
  Chip,
  Divider,
  IconButton,
  LinearProgress,
  Paper,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";

import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import FlagIcon from "@mui/icons-material/Flag";
import EditIcon from "@mui/icons-material/Edit";
import RepeatIcon from "@mui/icons-material/Repeat";

import IconSelectorMenu from "../../components/IconSelectorMenu/IconSelectorMenu";
import DashboardGrid, { type DashboardGridBlock } from "../DashboardPage/components/DashboardGrid";
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

const formatMoney = (value: number) =>
  new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
  }).format(value);

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const getIcon = (icons: IconOption[], id: IconId) =>
  icons.find((icon) => icon.id === id) ?? icons.find((icon) => icon.id === "other") ?? icons[0];

const sumTransactions = (transactions: SavingsTransaction[]) =>
  transactions.reduce((total, transaction) => total + transaction.amount, 0);

const Savings = ({ items, onChange }: Props) => {
  const icons = ICON_OPTIONS;
  const colorPresets = COLOR_PRESETS;
  const defaultColor = colorPresets[0] ?? "#1a73e8";

  const [editing, setEditing] = useState<EditingSaving>(null);
  const nameFocusRef = useRef<HTMLInputElement | null>(null);

  const [editor, setEditor] = useState<{ anchorEl: HTMLElement; id: string } | null>(null);
  const selected = useMemo(() => items.find((item) => item.id === editor?.id) ?? null, [items, editor?.id]);

  const [editingTx, setEditingTx] = useState<EditingTx>(null);
  const txFocusRef = useRef<HTMLInputElement | null>(null);

  const [txDraftById, setTxDraftById] = useState<Record<string, { amount: string; note: string }>>({});

  const getTxDraft = (id: string) => txDraftById[id] ?? { amount: "", note: "" };

  const patchTxDraft = (id: string, patch: Partial<{ amount: string; note: string }>) => {
    setTxDraftById((currentDrafts) => {
      const current = currentDrafts[id] ?? { amount: "", note: "" };

      return {
        ...currentDrafts,
        [id]: {
          ...current,
          ...patch,
        },
      };
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

  const stopEdit = () => {
    setEditing(null);
  };

  const createEmptySaving = (): SavingItem => ({
    id: createId(),
    name: "",
    iconId: "savings",
    iconImageUrl: null,
    color: defaultColor,
    goalAmount: null,
    recurring: false,
    transactions: [],
  });

  const patchSaving = (id: string, patch: Partial<SavingItem>) => {
    onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const addSaving = () => {
    const nextSaving = createEmptySaving();

    onChange([...items, nextSaving]);
    startEdit(nextSaving.id, "name");
  };

  const removeSaving = (id: string) => {
    onChange(items.filter((item) => item.id !== id));

    setTxDraftById((currentDrafts) => {
      if (!currentDrafts[id]) return currentDrafts;

      const nextDrafts = { ...currentDrafts };
      delete nextDrafts[id];

      return nextDrafts;
    });

    if (editor?.id === id) setEditor(null);
    if (editing?.id === id) setEditing(null);
    if (editingTx?.savingId === id) setEditingTx(null);
  };

  const addTransaction = (savingId: string) => {
    const draft = getTxDraft(savingId);
    const amount = parseNumber(draft.amount);

    if (amount === null) return;

    const note = draft.note.trim();

    const transaction: SavingsTransaction = {
      id: createId(),
      amount,
      note,
      createdAt: Date.now(),
    };

    onChange(
      items.map((item) =>
        item.id === savingId
          ? {
              ...item,
              transactions: [transaction, ...item.transactions],
            }
          : item,
      ),
    );

    patchTxDraft(savingId, { amount: "", note: "" });
  };

  const removeTransaction = (savingId: string, transactionId: string) => {
    onChange(
      items.map((item) =>
        item.id === savingId
          ? {
              ...item,
              transactions: item.transactions.filter((transaction) => transaction.id !== transactionId),
            }
          : item,
      ),
    );
  };

  const patchTransaction = (savingId: string, transactionId: string, patch: Partial<SavingsTransaction>) => {
    onChange(
      items.map((item) => {
        if (item.id !== savingId) return item;

        return {
          ...item,
          transactions: item.transactions.map((transaction) =>
            transaction.id === transactionId ? { ...transaction, ...patch } : transaction,
          ),
        };
      }),
    );
  };

  const startTxEdit = (savingId: string, transactionId: string, field: "amount" | "note") => {
    setEditingTx({ savingId, txId: transactionId, field });

    queueMicrotask(() => {
      txFocusRef.current?.focus();
      txFocusRef.current?.select();
    });
  };

  const stopTxEdit = () => {
    setEditingTx(null);
  };

  const renderSavingIcon = (item: SavingItem) => {
    if (item.iconImageUrl) {
      return <img src={item.iconImageUrl} alt="" className="bf-savings__custom-icon-image" />;
    }

    const IconComp = getIcon(icons, item.iconId).render;
    return IconComp({ fontSize: "small" });
  };

  const savingBlocks = useMemo<DashboardGridBlock[]>(() => {
    const addBlock: DashboardGridBlock = {
      id: `savings-add-tile-${items.length}`,
      title: "",
      defaultSize: "third",
      bare: true,
      content: (
        <ButtonBase className="bf-savings__add-tile" onClick={addSaving} focusRipple>
          <div className="bf-savings__add-tile-icon">
            <AddCircleOutlineIcon fontSize="small" />
          </div>

          <Typography fontWeight={900} className="bf-savings__add-tile-text">
            Add saving
          </Typography>
        </ButtonBase>
      ),
    };

    const itemBlocks = items.map((saving): DashboardGridBlock => {
      const total = sumTransactions(saving.transactions);
      const hasGoal = typeof saving.goalAmount === "number" && saving.goalAmount > 0;
      const progress = hasGoal ? clamp01(total / (saving.goalAmount as number)) : 0;
      const isEditingName = editing?.id === saving.id && editing.field === "name";
      const isEditingGoal = editing?.id === saving.id && editing.field === "goal";
      const draft = getTxDraft(saving.id);

      return {
        id: saving.id,
        title: (saving.name || "").trim() || "Saving",
        defaultSize: "third",
        content: (
          <Paper variant="outlined" className="bf-bubble-surface bf-savings__item">
            <Tooltip title="Delete" enterDelay={250}>
              <IconButton
                className="bf-delete-icon bf-delete-icon--floating bf-savings__delete-button"
                size="small"
                onClick={() => removeSaving(saving.id)}
                aria-label="Delete"
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <div className="bf-savings__item-head">
              <div className="bf-savings__item-left">
                <ButtonBase
                  className="bf-savings__icon"
                  onClick={(event) => setEditor({ anchorEl: event.currentTarget, id: saving.id })}
                  style={{ ["--bf-saving-color" as any]: saving.color }}
                  aria-label="Customize saving"
                >
                  {renderSavingIcon(saving)}
                </ButtonBase>

                <div className="bf-savings__meta">
                  {isEditingName ? (
                    <TextField
                      size="small"
                      value={saving.name}
                      onChange={(event) => patchSaving(saving.id, { name: event.target.value })}
                      onBlur={stopEdit}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === "Escape") stopEdit();
                      }}
                      inputRef={(element) => {
                        nameFocusRef.current = element;
                      }}
                      autoFocus
                      fullWidth
                      placeholder="New saving"
                      className="bf-savings__name-input"
                    />
                  ) : (
                    <div className="bf-savings__editable" onClick={() => startEdit(saving.id, "name")}>
                      <div className="bf-cell bf-savings__cell">
                        <Typography className="bf-savings__name">
                          {(saving.name || "").trim() ? saving.name : <span className="bf-cell__placeholder">New saving</span>}
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
                          ? `Progress: ${formatMoney(total)} / ${formatMoney(saving.goalAmount as number)}`
                          : `Total: ${formatMoney(total)}`
                      }
                      clickable={false}
                      className="bf-savings__chip"
                    />

                    {isEditingGoal ? (
                      <TextField
                        size="small"
                        value={saving.goalAmount === null ? "" : String(saving.goalAmount)}
                        onChange={(event) => {
                          const value = parseNumber(event.target.value);
                          patchSaving(saving.id, { goalAmount: value === null ? null : Math.max(0, value) });
                        }}
                        onBlur={stopEdit}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === "Escape") stopEdit();
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

                        <div className="bf-savings__editable" onClick={() => startEdit(saving.id, "goal")}>
                          <div className="bf-cell bf-savings__cell">
                            <Typography className="bf-savings__goal-value">
                              {hasGoal ? formatMoney(saving.goalAmount as number) : <span className="bf-cell__placeholder">No goal</span>}
                            </Typography>
                          </div>

                          <EditIcon className="bf-edit-hint bf-savings__edit-icon" fontSize="small" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bf-savings__head-actions">
                <Tooltip title="Repeat in next months" enterDelay={250}>
                  <IconButton
                    className="bf-icon-btn"
                    size="small"
                    onClick={() => patchSaving(saving.id, { recurring: !saving.recurring })}
                    aria-label="Repeat in next months"
                    sx={{ color: saving.recurring ? "var(--bf-primary)" : "text.secondary" }}
                  >
                    <RepeatIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </div>
            </div>

            {hasGoal ? (
              <div className="bf-savings__progress">
                <LinearProgress
                  variant="determinate"
                  value={progress * 100}
                  sx={{
                    height: 8,
                    borderRadius: 999,
                    backgroundColor: `${saving.color}22`,
                    "& .MuiLinearProgress-bar": {
                      backgroundColor: saving.color,
                    },
                  }}
                />

                <div className="bf-savings__progress-meta">
                  <Typography variant="caption" color="text.secondary" fontWeight={800}>
                    {Math.round(progress * 100)}%
                  </Typography>

                  <Typography variant="caption" color="text.secondary" fontWeight={800}>
                    {formatMoney(Math.max(0, (saving.goalAmount as number) - total))} left
                  </Typography>
                </div>
              </div>
            ) : null}

            <Divider className="bf-savings__divider" />

            <div className="bf-savings__tx-add">
              <TextField
                size="small"
                label="Amount"
                value={draft.amount}
                onChange={(event) => patchTxDraft(saving.id, { amount: event.target.value })}
                placeholder="Ex: 50"
                className="bf-savings__tx-amount"
              />

              <TextField
                size="small"
                label="Note"
                value={draft.note}
                onChange={(event) => patchTxDraft(saving.id, { note: event.target.value })}
                placeholder="Optional"
                fullWidth
                className="bf-savings__tx-note"
              />

              <Tooltip title="Add transaction" enterDelay={250}>
                <IconButton className="bf-icon-btn" size="small" onClick={() => addTransaction(saving.id)} aria-label="Add transaction">
                  <AddCircleOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </div>

            {saving.transactions.length > 0 ? (
              <div className="bf-savings__tx-list">
                {saving.transactions.slice(0, 6).map((transaction) => (
                  <Paper key={transaction.id} variant="outlined" className="bf-savings__tx-row">
                    <Tooltip title="Remove transaction" enterDelay={250}>
                      <IconButton
                        className="bf-delete-icon bf-delete-icon--floating bf-savings__tx-delete-button"
                        size="small"
                        onClick={() => removeTransaction(saving.id, transaction.id)}
                        aria-label="Remove transaction"
                      >
                        <RemoveCircleOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>

                    <div className="bf-savings__tx-row-inner">
                      <div className="bf-savings__tx-row-left">
                        {editingTx?.savingId === saving.id && editingTx.txId === transaction.id && editingTx.field === "amount" ? (
                          <TextField
                            size="small"
                            value={String(transaction.amount)}
                            onChange={(event) => {
                              const value = parseNumber(event.target.value);
                              if (value === null) return;
                              patchTransaction(saving.id, transaction.id, { amount: value });
                            }}
                            onBlur={stopTxEdit}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === "Escape") stopTxEdit();
                            }}
                            inputRef={(element) => {
                              txFocusRef.current = element;
                            }}
                            className="bf-savings__tx-edit bf-savings__tx-edit--amount"
                          />
                        ) : (
                          <div className="bf-savings__editable" onClick={() => startTxEdit(saving.id, transaction.id, "amount")}>
                            <Typography className="bf-savings__tx-amount-text">{formatMoney(transaction.amount)}</Typography>
                            <EditIcon className="bf-edit-hint bf-savings__edit-icon" fontSize="small" />
                          </div>
                        )}

                        {editingTx?.savingId === saving.id && editingTx.txId === transaction.id && editingTx.field === "note" ? (
                          <TextField
                            size="small"
                            value={transaction.note}
                            onChange={(event) => patchTransaction(saving.id, transaction.id, { note: event.target.value })}
                            onBlur={stopTxEdit}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === "Escape") stopTxEdit();
                            }}
                            inputRef={(element) => {
                              txFocusRef.current = element;
                            }}
                            fullWidth
                            className="bf-savings__tx-edit bf-savings__tx-edit--note"
                          />
                        ) : (
                          <div className="bf-savings__editable bf-savings__editable--note" onClick={() => startTxEdit(saving.id, transaction.id, "note")}>
                            <Typography className="bf-savings__tx-note-text">{transaction.note || "—"}</Typography>
                            <EditIcon className="bf-edit-hint bf-savings__edit-icon" fontSize="small" />
                          </div>
                        )}
                      </div>
                    </div>
                  </Paper>
                ))}

                {saving.transactions.length > 6 ? (
                  <Typography variant="caption" color="text.secondary" fontWeight={800} className="bf-savings__tx-more">
                    Showing latest 6 transactions…
                  </Typography>
                ) : null}
              </div>
            ) : (
              <Typography variant="body2" color="text.secondary" className="bf-savings__empty">
                No transactions yet.
              </Typography>
            )}
          </Paper>
        ),
      };
    });

    return [...itemBlocks, addBlock];
  }, [items, editing, editingTx, txDraftById]);

  return (
    <div id="bf-savings">
      <div className="bf-savings__grid-shell">
        <DashboardGrid blocks={savingBlocks} />
      </div>

      <IconSelectorMenu
        open={Boolean(editor)}
        anchorEl={editor?.anchorEl ?? null}
        onClose={() => setEditor(null)}
        row={
          selected
            ? {
                id: selected.id,
                label: selected.name,
                amount: selected.goalAmount,
                prevAmount: null,
                note: "",
                iconId: selected.iconId,
                iconImageUrl: selected.iconImageUrl ?? null,
                color: selected.color,
                categories: [],
                recurring: false,
              }
            : null
        }
        categories={[]}
        onCreateCategory={() => undefined}
        icons={icons}
        colorPresets={colorPresets}
        showCategories={false}
        allowCustomImages
        title="Customize saving"
        onChange={(patch) => {
          if (!selected) return;

          patchSaving(selected.id, {
            ...(patch.iconId ? { iconId: patch.iconId } : {}),
            ...(patch.iconImageUrl !== undefined ? { iconImageUrl: patch.iconImageUrl } : {}),
            ...(patch.color ? { color: patch.color } : {}),
          });
        }}
      />
    </div>
  );
};

export default Savings;