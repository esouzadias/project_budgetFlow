import "./TableSettingsPopup.styles.less";

import { useRef, useState, type ChangeEvent, type PointerEvent as ReactPointerEvent } from "react";

import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import ImageRoundedIcon from "@mui/icons-material/ImageRounded";
import NumbersRoundedIcon from "@mui/icons-material/NumbersRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import TextFieldsRoundedIcon from "@mui/icons-material/TextFieldsRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import Popover from "@mui/material/Popover";
import Switch from "@mui/material/Switch";
import Tooltip from "@mui/material/Tooltip";

import GenericInput from "../GenericInput/GenericInput";
import ColorPicker from "../ColorPicker/ColorPicker";
import {
  createDefaultRegistryTableSettings,
  createRegistryTableColumn,
  normalizeRegistryTableSettings,
  type RegistryTableColumnKind,
  type RegistryTableColumnKey,
} from "../RegistryTable/RegistryTable.types";

import type { BudgetTable } from "../../pages/DashboardPage/DashboardPage.types";
import { useLanguage } from "../../localization/useLanguage";
import type { LanguageDictionary } from "../../localization/languages";

type TableSettingsPopupProps = {
  table: BudgetTable;
  anchorEl: HTMLElement | null;
  onChange: (patch: Partial<BudgetTable>) => void;
  onClose: () => void;
};

const getDefaultTableName = (table: BudgetTable, dictionary: LanguageDictionary["dashboard"]) => {
  if (table.type === "income") return dictionary.income;
  if (table.type === "expense") return dictionary.expenses;
  if (table.type === "saving") return dictionary.savings;
  if (table.type === "debt") return dictionary.debt;

  return dictionary.customTable;
};

const getInitialPopupPosition = (anchorEl: HTMLElement | null) => {
  const rect = anchorEl?.getBoundingClientRect();
  const width = Math.min(420, window.innerWidth - 24);

  return {
    top: Math.max(12, Math.min(window.innerHeight - 80, (rect?.bottom ?? 24) + 8)),
    left: Math.max(12, Math.min(window.innerWidth - width - 12, (rect?.right ?? width + 12) - width)),
  };
};

const TableSettingsPopup = ({ table, anchorEl, onChange, onClose }: TableSettingsPopupProps) => {
  const { activeLanguage } = useLanguage();
  const dictionary = activeLanguage.dictionary;
  const [nameDraft, setNameDraft] = useState(table.name);
  const [newColumnName, setNewColumnName] = useState("");
  const [newColumnKind, setNewColumnKind] = useState<Extract<RegistryTableColumnKind, "text" | "amount">>("text");
  const [popupPosition, setPopupPosition] = useState(() => getInitialPopupPosition(anchorEl));
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const settings = normalizeRegistryTableSettings(table.settings, dictionary.table.columns);

  const commitName = () => {
    const cleanName = nameDraft.trim();

    if (cleanName && cleanName !== table.name) {
      onChange({ name: cleanName });
      return;
    }

    setNameDraft(table.name);
  };

  const addColumn = () => {
    const cleanName = newColumnName.trim();
    if (!cleanName) return;

    const columnKey = `custom_${crypto.randomUUID()}` as RegistryTableColumnKey;

    onChange({
      settings: {
        ...settings,
        columns: {
          ...settings.columns,
          [columnKey]: createRegistryTableColumn(newColumnKind, cleanName),
        },
        columnOrder: [...settings.columnOrder, columnKey],
        columnWidths: {
          ...settings.columnWidths,
          [columnKey]: newColumnKind === "text" ? 220 : 180,
        },
      },
    });

    setNewColumnName("");
  };

  const removeColumn = (column: RegistryTableColumnKey) => {
    if (settings.columnOrder.length <= 1) return;

    const columns = { ...settings.columns };
    const columnWidths = { ...settings.columnWidths };
    delete columns[column];
    delete columnWidths[column];

    onChange({
      settings: {
        ...settings,
        columns,
        columnWidths,
        columnOrder: settings.columnOrder.filter((currentColumn) => currentColumn !== column),
      },
      ...(column.startsWith("custom_")
        ? {
            rows: table.rows.map((row) => {
              const customValues = { ...(row.customValues ?? {}) };
              const customExpressions = { ...(row.customExpressions ?? {}) };
              delete customValues[column];
              delete customExpressions[column];

              return { ...row, customValues, customExpressions };
            }),
          }
        : {}),
    });
  };

  const resetTableDefaults = () => {
    const defaultName = getDefaultTableName(table, dictionary.dashboard);

    setNameDraft(defaultName);
    onChange({
      name: defaultName,
      settings: createDefaultRegistryTableSettings(dictionary.table.columns),
      accentColor: null,
      surfaceColorCustomized: false,
      contentColor: null,
      tableBackgroundColor: null,
      tableContentColor: null,
      backgroundImageUrl: null,
    });
  };

  const updateColumnAppearance = (
    column: RegistryTableColumnKey,
    patch: { backgroundColor?: string; textColor?: string },
  ) => {
    const currentColumn = settings.columns[column];

    onChange({
      settings: {
        ...settings,
        columns: {
          ...settings.columns,
          [column]: {
            ...currentColumn,
            ...(patch.backgroundColor !== undefined ? { backgroundColor: patch.backgroundColor } : {}),
            ...(patch.textColor !== undefined
              ? {
                  headerStyle: { ...currentColumn.headerStyle, color: patch.textColor },
                  cellStyle: { ...currentColumn.cellStyle, color: patch.textColor },
                }
              : {}),
          },
        },
      },
    });
  };

  const startDraggingPopup = (event: ReactPointerEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest("button, input, label")) return;

    event.preventDefault();
    const startX = event.clientX;
    const startY = event.clientY;
    const startPosition = popupPosition;

    const handlePointerMove = (pointerEvent: PointerEvent) => {
      const width = Math.min(420, window.innerWidth - 24);
      const nextLeft = startPosition.left + pointerEvent.clientX - startX;
      const nextTop = startPosition.top + pointerEvent.clientY - startY;

      setPopupPosition({
        left: Math.max(12, Math.min(window.innerWidth - width - 12, nextLeft)),
        top: Math.max(12, Math.min(window.innerHeight - 72, nextTop)),
      });
    };

    const stopDragging = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopDragging);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopDragging, { once: true });
  };

  const selectBackgroundImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !file.type.startsWith("image/") || file.size > 700_000) return;

    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      onChange({ backgroundImageUrl: reader.result });
    };

    reader.readAsDataURL(file);
  };

  return (
    <Popover
      open={Boolean(anchorEl)}
      anchorReference="anchorPosition"
      anchorPosition={popupPosition}
      onClose={onClose}
      transformOrigin={{ vertical: "top", horizontal: "left" }}
      slotProps={{ paper: { className: "bf-table-settings" } }}
    >
      <header className="bf-table-settings__header" onPointerDown={startDraggingPopup}>
        <span className="bf-table-settings__header-icon">
          <TuneRoundedIcon fontSize="small" />
        </span>

        <span>
          <strong>{dictionary.tableSettings.title}</strong>
          <small>{settings.columnOrder.length} {settings.columnOrder.length === 1 ? dictionary.tableSettings.column : dictionary.tableSettings.columns}</small>
        </span>

        <button type="button" className="bf-table-settings__close" onClick={onClose} aria-label={dictionary.tableSettings.close}>
          <CloseRoundedIcon fontSize="small" />
        </button>
      </header>

      <label className="bf-table-settings__field">
        <span>{dictionary.tableSettings.tableName}</span>
        <GenericInput
          value={nameDraft}
          onChange={(event) => setNameDraft(event.target.value)}
          onBlur={commitName}
          onCommit={commitName}
          className="bf-table-settings__name-input"
          size="small"
          fullWidth
        />
      </label>

      <p className="bf-table-settings__default-note">
        {dictionary.tableSettings.defaultNote}
      </p>

      <section className="bf-table-settings__section">
        <span className="bf-table-settings__section-label">{dictionary.tableSettings.tableColumns}</span>
        <div className="bf-table-settings__row-icons-option">
          <span className="bf-table-settings__option-icon">
            {settings.showIcons ? <VisibilityRoundedIcon fontSize="small" /> : <VisibilityOffRoundedIcon fontSize="small" />}
          </span>
          <span>
            <strong>{dictionary.tableSettings.rowIcons}</strong>
            <small>{dictionary.tableSettings.rowIconsHelp}</small>
          </span>
          <Switch
            size="small"
            checked={settings.showIcons}
            onChange={(_, checked) => onChange({ settings: { ...settings, showIcons: checked } })}
          />
        </div>

        <div className="bf-table-settings__columns">
          {settings.columnOrder.map((column) => {
            const columnSettings = settings.columns[column];
            const isAmount = columnSettings.kind === "amount" || columnSettings.kind === "previous" || columnSettings.kind === "difference";

            return (
              <div key={column} className="bf-table-settings__column">
                <span className="bf-table-settings__column-icon">
                  {isAmount ? <NumbersRoundedIcon fontSize="small" /> : <TextFieldsRoundedIcon fontSize="small" />}
                </span>
                <span>
                  <strong>{columnSettings.header}</strong>
                  <small>{dictionary.tableSettings.kinds[columnSettings.kind]}</small>
                </span>
                <div className="bf-table-settings__column-colors">
                  <ColorPicker
                    compact
                    label={`${columnSettings.header} — ${dictionary.tableSettings.background}`}
                    value={columnSettings.backgroundColor ?? null}
                    onChange={(color) => updateColumnAppearance(column, { backgroundColor: color ?? "" })}
                  />
                  <ColorPicker
                    compact
                    label={`${columnSettings.header} — ${dictionary.tableSettings.text}`}
                    value={columnSettings.cellStyle.color || null}
                    allowGradient={false}
                    onChange={(color) => updateColumnAppearance(column, { textColor: color ?? "" })}
                  />
                </div>
                <Tooltip title={settings.columnOrder.length === 1 ? dictionary.tableSettings.oneColumnRequired : dictionary.tableSettings.deleteColumn} arrow>
                  <span>
                    <button
                      type="button"
                      className="bf-table-settings__column-delete"
                      onClick={() => removeColumn(column)}
                      disabled={settings.columnOrder.length === 1}
                      aria-label={`${dictionary.tableSettings.deleteColumnLabel}: ${columnSettings.header}`}
                    >
                      <DeleteOutlineRoundedIcon fontSize="small" />
                    </button>
                  </span>
                </Tooltip>
              </div>
            );
          })}
        </div>

        <div className="bf-table-settings__column-builder">
          <div className="bf-table-settings__column-kind" role="group" aria-label={dictionary.tableSettings.newColumnType}>
            <Tooltip title={dictionary.tableSettings.textColumn} arrow>
              <button
                type="button"
                className={newColumnKind === "text" ? "bf-table-settings__column-kind--active" : ""}
                onClick={() => setNewColumnKind("text")}
                aria-label={dictionary.tableSettings.createTextColumn}
              >
                <TextFieldsRoundedIcon fontSize="small" />
              </button>
            </Tooltip>
            <Tooltip title={dictionary.tableSettings.valueColumn} arrow>
              <button
                type="button"
                className={newColumnKind === "amount" ? "bf-table-settings__column-kind--active" : ""}
                onClick={() => setNewColumnKind("amount")}
                aria-label={dictionary.tableSettings.createValueColumn}
              >
                <NumbersRoundedIcon fontSize="small" />
              </button>
            </Tooltip>
          </div>

          <GenericInput
            value={newColumnName}
            onValueChange={setNewColumnName}
            onCommit={addColumn}
            placeholder={dictionary.tableSettings.newColumnName}
            size="small"
            fullWidth
          />

          <Tooltip title={dictionary.tableSettings.addColumn} arrow>
            <button
              type="button"
              className="bf-table-settings__column-add"
              onClick={addColumn}
              disabled={!newColumnName.trim()}
              aria-label={dictionary.tableSettings.addColumn}
            >
              <AddRoundedIcon fontSize="small" />
            </button>
          </Tooltip>
        </div>
      </section>

      <section className="bf-table-settings__section">
        <span className="bf-table-settings__section-label">{dictionary.tableSettings.appearance}</span>
        <div className="bf-table-settings__appearance-bundle">
          <ColorPicker
            label={dictionary.tableSettings.canvas}
            value={table.surfaceColorCustomized ? table.accentColor : null}
            onChange={(color) => onChange({ accentColor: color, surfaceColorCustomized: Boolean(color) })}
          />
          <ColorPicker
            label={dictionary.tableSettings.canvasContent}
            value={table.contentColor ?? null}
            allowGradient={false}
            onChange={(color) => onChange({ contentColor: color })}
          />
          <ColorPicker
            label={dictionary.tableSettings.table}
            value={table.tableBackgroundColor ?? null}
            onChange={(color) => onChange({ tableBackgroundColor: color })}
          />
          <ColorPicker
            label={dictionary.tableSettings.tableContent}
            value={table.tableContentColor ?? null}
            allowGradient={false}
            onChange={(color) => onChange({ tableContentColor: color })}
          />
        </div>

        <div className="bf-table-settings__image-actions">
          <button type="button" onClick={() => fileInputRef.current?.click()}>
            <ImageRoundedIcon fontSize="small" />
            <span>{table.backgroundImageUrl ? dictionary.tableSettings.replaceImage : dictionary.tableSettings.addBackgroundImage}</span>
          </button>

          {table.backgroundImageUrl ? (
            <button type="button" onClick={() => onChange({ backgroundImageUrl: null })}>{dictionary.tableSettings.removeImage}</button>
          ) : null}
        </div>

        <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={selectBackgroundImage} />
        <small className="bf-table-settings__image-hint">{dictionary.tableSettings.imageHint}</small>
      </section>

      <footer className="bf-table-settings__footer">
        <button type="button" onClick={resetTableDefaults}>
          <RestartAltRoundedIcon fontSize="small" />
          <span>{dictionary.tableSettings.resetDefaults}</span>
        </button>
      </footer>
    </Popover>
  );
};

export default TableSettingsPopup;
