import "./ColorPicker.styles.less";

import { useEffect, useState, type CSSProperties } from "react";

import AutoFixHighRoundedIcon from "@mui/icons-material/AutoFixHighRounded";
import GradientRoundedIcon from "@mui/icons-material/GradientRounded";
import PaletteRoundedIcon from "@mui/icons-material/PaletteRounded";
import Popover from "@mui/material/Popover";
import Tooltip from "@mui/material/Tooltip";

import { COLOR_PRESETS } from "../IconSelectorMenu/IconSelectorMenu.db";
import { useLanguage } from "../../localization/useLanguage";

export type ColorPickerProps = {
  label: string;
  value?: string | null;
  onChange: (color: string | null) => void;
  allowAuto?: boolean;
  allowGradient?: boolean;
  presets?: string[];
  compact?: boolean;
  inline?: boolean;
};

type GradientDraft = {
  angle: number;
  start: string;
  end: string;
};

const DEFAULT_COLOR = "#20bfa9";
const DEFAULT_GRADIENT: GradientDraft = {
  angle: 135,
  start: "#20bfa9",
  end: "#43cf7c",
};

const isHexColor = (value?: string | null) => Boolean(value && /^#[0-9a-f]{6}$/i.test(value));
const isGradientValue = (value?: string | null) => Boolean(value && /gradient\(/i.test(value));

const parseGradient = (value?: string | null): GradientDraft => {
  const match = value?.match(
    /linear-gradient\(\s*(-?\d+(?:\.\d+)?)deg\s*,\s*(#[0-9a-f]{6})\s*,\s*(#[0-9a-f]{6})\s*\)/i,
  );

  if (!match) return DEFAULT_GRADIENT;

  return {
    angle: Number(match[1]),
    start: match[2],
    end: match[3],
  };
};

const createGradient = ({ angle, start, end }: GradientDraft) => {
  return `linear-gradient(${angle}deg, ${start}, ${end})`;
};

const ColorPicker = ({
  label,
  value,
  onChange,
  allowAuto = true,
  allowGradient = true,
  presets = COLOR_PRESETS,
  compact = false,
  inline = false,
}: ColorPickerProps) => {
  const { activeLanguage } = useLanguage();
  const dictionary = activeLanguage.dictionary;
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [customAnchorEl, setCustomAnchorEl] = useState<HTMLElement | null>(null);
  const [gradientAnchorEl, setGradientAnchorEl] = useState<HTMLElement | null>(null);
  const [customColor, setCustomColor] = useState(isHexColor(value) ? value! : DEFAULT_COLOR);
  const [gradientDraft, setGradientDraft] = useState<GradientDraft>(() => parseGradient(value));

  const gradientValue = createGradient(gradientDraft);
  const valueIsGradient = isGradientValue(value);

  useEffect(() => {
    if (isHexColor(value)) setCustomColor(value!);
    if (isGradientValue(value)) setGradientDraft(parseGradient(value));
  }, [value]);

  const closeAll = () => {
    setAnchorEl(null);
    setCustomAnchorEl(null);
    setGradientAnchorEl(null);
  };

  const selectValue = (nextValue: string | null) => {
    onChange(nextValue);
    if (!inline) setAnchorEl(null);
  };

  const palette = (
    <div className={`bf-color-picker__palette ${inline ? "bf-color-picker__palette--inline" : ""}`}>
      {allowAuto ? (
        <Tooltip title={dictionary.colorPicker.automatic} arrow>
          <button
            type="button"
            className={`bf-color-picker__option bf-color-picker__option--auto ${!value ? "bf-color-picker__option--active" : ""}`}
            onClick={() => selectValue(null)}
            aria-label={dictionary.colorPicker.useAutomatic}
          >
            A
          </button>
        </Tooltip>
      ) : null}

      {presets.map((color) => (
        <Tooltip key={color} title={color} arrow>
          <button
            type="button"
            className={`bf-color-picker__option ${value === color ? "bf-color-picker__option--active" : ""}`}
            style={{ background: color }}
            onClick={() => {
              setCustomColor(color);
              selectValue(color);
            }}
            aria-label={`${dictionary.colorPicker.useColor} ${color}`}
          />
        </Tooltip>
      ))}

      <Tooltip title={dictionary.colorPicker.customColor} arrow>
        <button
          type="button"
          className={`bf-color-picker__option bf-color-picker__option--custom ${
            value && !valueIsGradient && !presets.includes(value) ? "bf-color-picker__option--active" : ""
          }`}
          onClick={(event) => setCustomAnchorEl(event.currentTarget)}
          aria-label={dictionary.colorPicker.chooseCustomColor}
        >
          <PaletteRoundedIcon />
        </button>
      </Tooltip>

      {allowGradient ? (
        <Tooltip title={dictionary.colorPicker.gradient} arrow>
          <button
            type="button"
            className={`bf-color-picker__option bf-color-picker__option--gradient ${valueIsGradient ? "bf-color-picker__option--active" : ""}`}
            style={{ background: valueIsGradient ? value! : createGradient(DEFAULT_GRADIENT) }}
            onClick={(event) => {
              setGradientDraft(parseGradient(value));
              setGradientAnchorEl(event.currentTarget);
            }}
            aria-label={dictionary.colorPicker.createGradient}
          >
            <GradientRoundedIcon />
          </button>
        </Tooltip>
      ) : null}
    </div>
  );

  return (
    <>
      {!inline ? (
        <Tooltip title={label} arrow>
          <button
            type="button"
            className={`bf-color-picker__trigger ${compact ? "bf-color-picker__trigger--compact" : ""}`}
            onClick={(event) => setAnchorEl(event.currentTarget)}
            aria-label={label}
          >
            <span
              className={`bf-color-picker__swatch ${!value ? "bf-color-picker__swatch--auto" : ""}`}
              style={value ? ({ "--bf-picked-color": value } as CSSProperties) : undefined}
            >
              {!value ? <AutoFixHighRoundedIcon fontSize="inherit" /> : null}
            </span>
            {!compact ? <span>{label}</span> : null}
          </button>
        </Tooltip>
      ) : (
        palette
      )}

      {!inline ? (
        <Popover
          open={Boolean(anchorEl)}
          anchorEl={anchorEl}
          onClose={closeAll}
          anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
          transformOrigin={{ vertical: "top", horizontal: "left" }}
          slotProps={{ paper: { className: "bf-color-picker__popover" } }}
        >
          <header>
            <strong>{label}</strong>
            <small>{value ?? dictionary.common.automaticContrast}</small>
          </header>
          {palette}
        </Popover>
      ) : null}

      <Popover
        open={Boolean(customAnchorEl)}
        anchorEl={customAnchorEl}
        onClose={() => setCustomAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { className: "bf-color-picker__editor" } }}
      >
        <strong>{dictionary.colorPicker.customColor}</strong>
        <label className="bf-color-picker__native-color">
          <span style={{ background: customColor }} />
          <input
            type="color"
            value={customColor}
            onChange={(event) => {
              setCustomColor(event.target.value);
              onChange(event.target.value);
            }}
            aria-label={dictionary.colorPicker.customColor}
          />
          <small>{customColor}</small>
        </label>
      </Popover>

      {allowGradient ? (
        <Popover
          open={Boolean(gradientAnchorEl)}
          anchorEl={gradientAnchorEl}
          onClose={() => setGradientAnchorEl(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
          slotProps={{ paper: { className: "bf-color-picker__editor bf-color-picker__gradient-editor" } }}
        >
          <strong>{dictionary.colorPicker.gradient}</strong>
          <div className="bf-color-picker__gradient-preview" style={{ background: gradientValue }} />

          <div className="bf-color-picker__gradient-colors">
            <label>
              <span>{dictionary.colorPicker.start}</span>
              <input
                type="color"
                value={gradientDraft.start}
                onChange={(event) => setGradientDraft((current) => ({ ...current, start: event.target.value }))}
              />
            </label>
            <label>
              <span>{dictionary.colorPicker.end}</span>
              <input
                type="color"
                value={gradientDraft.end}
                onChange={(event) => setGradientDraft((current) => ({ ...current, end: event.target.value }))}
              />
            </label>
            <label>
              <span>{dictionary.colorPicker.angle}</span>
              <select
                value={gradientDraft.angle}
                onChange={(event) => setGradientDraft((current) => ({ ...current, angle: Number(event.target.value) }))}
              >
                {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
                  <option key={angle} value={angle}>{angle}°</option>
                ))}
              </select>
            </label>
          </div>

          <button
            type="button"
            className="bf-color-picker__apply-gradient"
            onClick={() => {
              onChange(gradientValue);
              setGradientAnchorEl(null);
              if (!inline) setAnchorEl(null);
            }}
          >
            {dictionary.colorPicker.applyGradient}
          </button>
        </Popover>
      ) : null}
    </>
  );
};

export default ColorPicker;
