import { useMemo, useRef, useState, type CSSProperties } from "react";
import { ButtonBase, IconButton, LinearProgress, Tooltip, Typography } from "@mui/material";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import FlagRoundedIcon from "@mui/icons-material/FlagRounded";
import RepeatRoundedIcon from "@mui/icons-material/RepeatRounded";

import IconSelectorMenu from "../../components/IconSelectorMenu/IconSelectorMenu";
import GenericInput from "../../components/GenericInput/GenericInput";
import DashboardGrid, { type DashboardGridBlock } from "../DashboardPage/components/DashboardGrid";
import { COLOR_PRESETS, ICON_OPTIONS } from "../../components/IconSelectorMenu/IconSelectorMenu.db";
import { useLanguage } from "../../localization/useLanguage";

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

const formatMoney = (value: number, locale: string) =>
  new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
  }).format(value);

const formatTransactionDate = (value: number, locale: string) =>
  new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
  }).format(value);

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const getIcon = (icons: IconOption[], id: IconId) =>
  icons.find((icon) => icon.id === id) ?? icons.find((icon) => icon.id === "other") ?? icons[0];

const sumTransactions = (transactions: SavingsTransaction[]) =>
  transactions.reduce((total, transaction) => total + transaction.amount, 0);

const Savings = ({ items, onChange }: Props) => {
  const { activeLanguage } = useLanguage();
  const dictionary = activeLanguage.dictionary;
  const icons = ICON_OPTIONS;
  const colorPresets = COLOR_PRESETS;
  const defaultColor = colorPresets[0] ?? "#1a73e8";

  const [editing, setEditing] = useState<EditingSaving>(null);
  const [savingValueDraft, setSavingValueDraft] = useState("");
  const nameFocusRef = useRef<HTMLInputElement | null>(null);

  const [editor, setEditor] = useState<{ anchorEl: HTMLElement; id: string } | null>(null);
  const selected = useMemo(() => items.find((item) => item.id === editor?.id) ?? null, [items, editor?.id]);

  const [editingTx, setEditingTx] = useState<EditingTx>(null);
  const [transactionValueDraft, setTransactionValueDraft] = useState("");
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

    if (field === "goal") {
      const saving = items.find((item) => item.id === id);
      setSavingValueDraft(saving?.goalAmount === null || saving?.goalAmount === undefined ? "" : String(saving.goalAmount));
    }

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

  const addTransaction = (savingId: string, amountOverride?: number) => {
    const draft = getTxDraft(savingId);
    const amount = amountOverride ?? parseNumber(draft.amount);

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

    if (field === "amount") {
      const transaction = items
        .find((item) => item.id === savingId)
        ?.transactions.find((item) => item.id === transactionId);

      setTransactionValueDraft(transaction ? String(transaction.amount) : "");
    }

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

  const savingBlocks: DashboardGridBlock[] = (() => {
    const addBlock: DashboardGridBlock = {
      id: `savings-add-tile-${items.length}`,
      title: "",
      defaultSpan: 6,
      bare: true,
      content: (
        <ButtonBase className="bf-savings__add-tile" onClick={addSaving} focusRipple>
          <div className="bf-savings__add-tile-icon">
            <AddRoundedIcon fontSize="medium" />
          </div>

          <Typography fontWeight={900} className="bf-savings__add-tile-text">
            {dictionary.savings.addSaving}
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
        title: (saving.name || "").trim() || dictionary.savings.saving,
        defaultSpan: 6,
        content: (
          <article
            className="bf-savings__item"
            style={{ "--bf-saving-color": saving.color } as CSSProperties}
          >
            <header className="bf-savings__item-head">
              <Tooltip title={dictionary.savings.customize} enterDelay={250}>
                <ButtonBase
                  className="bf-savings__icon"
                  onClick={(event) => setEditor({ anchorEl: event.currentTarget, id: saving.id })}
                  aria-label={dictionary.savings.customize}
                >
                  {renderSavingIcon(saving)}
                </ButtonBase>
              </Tooltip>

              <div className="bf-savings__identity">
                {isEditingName ? (
                  <GenericInput
                    size="small"
                    value={saving.name}
                    onChange={(event) => patchSaving(saving.id, { name: event.target.value })}
                    onBlur={stopEdit}
                    onCommit={stopEdit}
                    onCancel={stopEdit}
                    inputRef={(element) => {
                      nameFocusRef.current = element;
                    }}
                    autoFocus
                    fullWidth
                    placeholder={dictionary.savings.newSaving}
                    className="bf-savings__name-input"
                  />
                ) : (
                  <ButtonBase className="bf-savings__name-button" onClick={() => startEdit(saving.id, "name")}>
                    <Typography className="bf-savings__name">
                      {(saving.name || "").trim() || dictionary.savings.newSaving}
                    </Typography>
                    <EditRoundedIcon className="bf-savings__edit-icon" fontSize="small" />
                  </ButtonBase>
                )}

                <Typography className="bf-savings__identity-caption">
                  {saving.recurring ? dictionary.savings.repeat : dictionary.savings.saving}
                </Typography>
              </div>

              <div className="bf-savings__head-actions">
                <Tooltip title={dictionary.savings.repeat} enterDelay={250}>
                  <IconButton
                    className={`bf-savings__action-button ${saving.recurring ? "bf-savings__action-button--active" : ""}`}
                    size="small"
                    onClick={() => patchSaving(saving.id, { recurring: !saving.recurring })}
                    aria-label={dictionary.savings.repeat}
                    aria-pressed={saving.recurring}
                  >
                    <RepeatRoundedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>

                <Tooltip title={dictionary.savings.delete} enterDelay={250}>
                  <IconButton
                    className="bf-savings__action-button bf-savings__action-button--danger"
                    size="small"
                    onClick={() => removeSaving(saving.id)}
                    aria-label={dictionary.savings.delete}
                  >
                    <DeleteOutlineRoundedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </div>
            </header>

            <section className="bf-savings__summary" aria-label={dictionary.savings.progress}>
              <div className="bf-savings__saved-value">
                <Typography component="span">{dictionary.savings.saved}</Typography>
                <Typography component="strong">{formatMoney(total, activeLanguage.locale)}</Typography>
              </div>

              {isEditingGoal ? (
                <GenericInput
                  size="small"
                  value={savingValueDraft}
                  onChange={(event) => setSavingValueDraft(event.target.value)}
                  onBlur={() => {
                    const value = parseNumber(savingValueDraft);
                    patchSaving(saving.id, { goalAmount: value === null ? null : Math.max(0, value) });
                    stopEdit();
                  }}
                  allowCalculations
                  decimalSeparator=","
                  onCalculation={(value, displayValue) => {
                    setSavingValueDraft(displayValue);
                    patchSaving(saving.id, { goalAmount: Math.max(0, value) });
                  }}
                  onCommit={stopEdit}
                  onCancel={stopEdit}
                  autoFocus
                  className="bf-savings__goal-input"
                />
              ) : (
                <ButtonBase className="bf-savings__goal-button" onClick={() => startEdit(saving.id, "goal")}>
                  <FlagRoundedIcon fontSize="small" />
                  <span>
                    <small>{dictionary.savings.goal}</small>
                    <strong>
                      {hasGoal
                        ? formatMoney(saving.goalAmount as number, activeLanguage.locale)
                        : dictionary.savings.noGoal}
                    </strong>
                  </span>
                  <EditRoundedIcon className="bf-savings__edit-icon" fontSize="small" />
                </ButtonBase>
              )}

              {hasGoal ? (
                <div className="bf-savings__remaining">
                  <strong>{Math.round(progress * 100)}%</strong>
                  <span>
                    {formatMoney(Math.max(0, (saving.goalAmount as number) - total), activeLanguage.locale)} {dictionary.savings.left}
                  </span>
                </div>
              ) : null}
            </section>

            {hasGoal ? (
              <LinearProgress
                className="bf-savings__progress"
                variant="determinate"
                value={progress * 100}
              />
            ) : null}

            <section className="bf-savings__composer" aria-label={dictionary.savings.addTransaction}>
              <Typography className="bf-savings__section-label">{dictionary.savings.addTransaction}</Typography>

              <div className="bf-savings__tx-add">
                <GenericInput
                  size="small"
                  label={dictionary.savings.amount}
                  value={draft.amount}
                  onChange={(event) => patchTxDraft(saving.id, { amount: event.target.value })}
                  placeholder={dictionary.savings.amountExample}
                  className="bf-savings__tx-amount"
                  allowCalculations
                  decimalSeparator=","
                  onCalculation={(value) => addTransaction(saving.id, value)}
                />

                <GenericInput
                  size="small"
                  label={dictionary.savings.note}
                  value={draft.note}
                  onChange={(event) => patchTxDraft(saving.id, { note: event.target.value })}
                  placeholder={dictionary.savings.optional}
                  onCommit={() => addTransaction(saving.id)}
                  fullWidth
                  className="bf-savings__tx-note"
                />

                <Tooltip title={dictionary.savings.addTransaction} enterDelay={250}>
                  <IconButton
                    className="bf-savings__add-transaction"
                    size="small"
                    onClick={() => addTransaction(saving.id)}
                    aria-label={dictionary.savings.addTransaction}
                    disabled={parseNumber(draft.amount) === null}
                  >
                    <AddRoundedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </div>
            </section>

            <section className="bf-savings__activity" aria-label={dictionary.savings.recentTransactions}>
              <div className="bf-savings__activity-head">
                <Typography className="bf-savings__section-label">{dictionary.savings.recentTransactions}</Typography>
                {saving.transactions.length > 0 ? <span>{saving.transactions.length}</span> : null}
              </div>

              {saving.transactions.length > 0 ? (
                <div className="bf-savings__tx-list">
                  {saving.transactions.slice(0, 6).map((transaction) => (
                    <div key={transaction.id} className="bf-savings__tx-row">
                      <span
                        className={`bf-savings__tx-marker ${transaction.amount < 0 ? "bf-savings__tx-marker--negative" : ""}`}
                        aria-hidden="true"
                      />

                      <div className="bf-savings__tx-main">
                        {editingTx?.savingId === saving.id && editingTx.txId === transaction.id && editingTx.field === "amount" ? (
                          <GenericInput
                            size="small"
                            value={transactionValueDraft}
                            onChange={(event) => setTransactionValueDraft(event.target.value)}
                            onBlur={() => {
                              const value = parseNumber(transactionValueDraft);
                              if (value !== null) patchTransaction(saving.id, transaction.id, { amount: value });
                              stopTxEdit();
                            }}
                            allowCalculations
                            decimalSeparator=","
                            onCalculation={(value, displayValue) => {
                              setTransactionValueDraft(displayValue);
                              patchTransaction(saving.id, transaction.id, { amount: value });
                            }}
                            onCommit={stopTxEdit}
                            onCancel={stopTxEdit}
                            inputRef={(element) => {
                              txFocusRef.current = element;
                            }}
                            className="bf-savings__tx-edit bf-savings__tx-edit--amount"
                          />
                        ) : (
                          <ButtonBase className="bf-savings__tx-edit-button" onClick={() => startTxEdit(saving.id, transaction.id, "amount")}>
                            <Typography className="bf-savings__tx-amount-text">{formatMoney(transaction.amount, activeLanguage.locale)}</Typography>
                            <EditRoundedIcon className="bf-savings__edit-icon" fontSize="small" />
                          </ButtonBase>
                        )}

                        {editingTx?.savingId === saving.id && editingTx.txId === transaction.id && editingTx.field === "note" ? (
                          <GenericInput
                            size="small"
                            value={transaction.note}
                            onChange={(event) => patchTransaction(saving.id, transaction.id, { note: event.target.value })}
                            onBlur={stopTxEdit}
                            onCommit={stopTxEdit}
                            onCancel={stopTxEdit}
                            inputRef={(element) => {
                              txFocusRef.current = element;
                            }}
                            fullWidth
                            className="bf-savings__tx-edit bf-savings__tx-edit--note"
                          />
                        ) : (
                          <ButtonBase className="bf-savings__tx-edit-button bf-savings__tx-edit-button--note" onClick={() => startTxEdit(saving.id, transaction.id, "note")}>
                            <Typography className="bf-savings__tx-note-text">{transaction.note || "—"}</Typography>
                            <EditRoundedIcon className="bf-savings__edit-icon" fontSize="small" />
                          </ButtonBase>
                        )}
                      </div>

                      <time>{formatTransactionDate(transaction.createdAt, activeLanguage.locale)}</time>

                      <Tooltip title={dictionary.savings.removeTransaction} enterDelay={250}>
                        <IconButton
                          className="bf-savings__tx-delete-button"
                          size="small"
                          onClick={() => removeTransaction(saving.id, transaction.id)}
                          aria-label={dictionary.savings.removeTransaction}
                        >
                          <DeleteOutlineRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </div>
                  ))}

                  {saving.transactions.length > 6 ? (
                    <Typography className="bf-savings__tx-more">{dictionary.savings.latestTransactions}</Typography>
                  ) : null}
                </div>
              ) : (
                <Typography className="bf-savings__empty">{dictionary.savings.noTransactions}</Typography>
              )}
            </section>
          </article>
        ),
      };
    });

    return [...itemBlocks, addBlock];
  })();

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
        title={dictionary.savings.customize}
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
