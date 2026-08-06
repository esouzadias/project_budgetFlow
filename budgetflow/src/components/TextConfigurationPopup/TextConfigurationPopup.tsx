import { useState } from 'react';

import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import FormatAlignCenterRoundedIcon from '@mui/icons-material/FormatAlignCenterRounded';
import FormatAlignLeftRoundedIcon from '@mui/icons-material/FormatAlignLeftRounded';
import FormatAlignRightRoundedIcon from '@mui/icons-material/FormatAlignRightRounded';
import FormatBoldRoundedIcon from '@mui/icons-material/FormatBoldRounded';
import FormatItalicRoundedIcon from '@mui/icons-material/FormatItalicRounded';
import FormatStrikethroughRoundedIcon from '@mui/icons-material/FormatStrikethroughRounded';
import FormatUnderlinedRoundedIcon from '@mui/icons-material/FormatUnderlinedRounded';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import TableRowsRoundedIcon from '@mui/icons-material/TableRowsRounded';
import TitleRoundedIcon from '@mui/icons-material/TitleRounded';
import ButtonBase from '@mui/material/ButtonBase';
import Divider from '@mui/material/Divider';
import Popover from '@mui/material/Popover';
import Tooltip from '@mui/material/Tooltip';

import ColorPicker from '../ColorPicker/ColorPicker';
import { useLanguage } from '../../localization/useLanguage';
import {
  createDefaultRegistryTableSettings,
  type RegistryTableColumnKey,
  type RegistryTableColumnSettings,
  type RegistryTableTextAlign,
  type RegistryTableTextSettings,
} from '../RegistryTable/RegistryTable.types';

import './TextConfigurationPopup.styles.less';

type TextConfigurationPopupProps = {
  anchorEl: HTMLElement | null;
  column: RegistryTableColumnKey | null;
  settings: RegistryTableColumnSettings | null;
  colorPresets?: string[];
  onChange: (settings: RegistryTableColumnSettings) => void;
  onClose: () => void;
};

type FormattingTarget = 'header' | 'cells';

const FONT_SIZES = Array.from({ length: 15 }, (_, index) => index + 10);
const FONT_FAMILIES = [
  { label: 'System', value: 'inherit' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
  { label: 'Trebuchet', value: '"Trebuchet MS", sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Times', value: '"Times New Roman", serif' },
  { label: 'Palatino', value: 'Palatino, "Palatino Linotype", serif' },
  { label: 'Courier', value: '"Courier New", monospace' },
];
const ALIGNMENTS: RegistryTableTextAlign[] = ['left', 'center', 'right'];

const TextConfigurationPopup = ({
  anchorEl,
  column,
  settings,
  colorPresets = [],
  onChange,
  onClose,
}: TextConfigurationPopupProps) => {
  const { activeLanguage } = useLanguage();
  const dictionary = activeLanguage.dictionary;
  const [target, setTarget] = useState<FormattingTarget>('cells');

  const closePopup = () => {
    onClose();
  };

  if (!column || !settings) return null;

  const styleKey = target === 'header' ? 'headerStyle' : 'cellStyle';
  const activeStyle = settings[styleKey];
  const alignmentMeta = {
    left: { label: dictionary.textConfiguration.alignLeft, icon: FormatAlignLeftRoundedIcon },
    center: { label: dictionary.textConfiguration.alignCenter, icon: FormatAlignCenterRoundedIcon },
    right: { label: dictionary.textConfiguration.alignRight, icon: FormatAlignRightRoundedIcon },
  }[activeStyle.align];
  const AlignmentIcon = alignmentMeta.icon;

  const patchStyle = (patch: Partial<RegistryTableTextSettings>) => {
    onChange({
      ...settings,
      [styleKey]: {
        ...activeStyle,
        ...patch,
      },
    });
  };

  const cycleAlignment = () => {
    const currentIndex = ALIGNMENTS.indexOf(activeStyle.align);
    const nextAlignment = ALIGNMENTS[(currentIndex + 1) % ALIGNMENTS.length];

    patchStyle({ align: nextAlignment });
  };

  const resetActiveStyle = () => {
    const defaults = createDefaultRegistryTableSettings(dictionary.table.columns).columns[column];
    patchStyle(defaults[styleKey]);
  };

  return (
    <>
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={closePopup}
        disableRestoreFocus
        anchorOrigin={{ vertical: 'center', horizontal: 'center' }}
        transformOrigin={{ vertical: 'center', horizontal: 'center' }}
        slotProps={{ paper: { className: 'bf-text-config' } }}
      >
        <div className="bf-text-config__toolbar" role="toolbar" aria-label={`${dictionary.textConfiguration.format} ${settings.header}`}>
          <strong className="bf-text-config__column-name">{settings.header}</strong>

          <Divider orientation="vertical" flexItem className="bf-text-config__divider" />

          <div className="bf-text-config__target" aria-label={dictionary.textConfiguration.applyFormattingTo}>
            <Tooltip title={dictionary.textConfiguration.formatHeader} arrow>
              <ButtonBase
                className={`bf-text-config__button ${target === 'header' ? 'bf-text-config__button--active' : ''}`}
                onClick={() => setTarget('header')}
                aria-label={dictionary.textConfiguration.formatHeader}
                aria-pressed={target === 'header'}
              >
                <TitleRoundedIcon fontSize="small" />
              </ButtonBase>
            </Tooltip>

            <Tooltip title={dictionary.textConfiguration.formatCells} arrow>
              <ButtonBase
                className={`bf-text-config__button ${target === 'cells' ? 'bf-text-config__button--active' : ''}`}
                onClick={() => setTarget('cells')}
                aria-label={dictionary.textConfiguration.formatCells}
                aria-pressed={target === 'cells'}
              >
                <TableRowsRoundedIcon fontSize="small" />
              </ButtonBase>
            </Tooltip>
          </div>

          <Divider orientation="vertical" flexItem className="bf-text-config__divider" />

          <Tooltip title={`${alignmentMeta.label}. ${dictionary.textConfiguration.clickToChange}`} arrow>
            <ButtonBase
              className="bf-text-config__button"
              onClick={cycleAlignment}
              aria-label={`${alignmentMeta.label}. ${dictionary.textConfiguration.clickToChange}`}
            >
              <AlignmentIcon fontSize="small" />
            </ButtonBase>
          </Tooltip>

          <label className="bf-text-config__font" aria-label={dictionary.textConfiguration.fontFamily}>
            <select
              value={activeStyle.fontFamily}
              onChange={(event) => patchStyle({ fontFamily: event.target.value })}
              aria-label={dictionary.textConfiguration.fontFamily}
              style={{ fontFamily: activeStyle.fontFamily }}
            >
              {FONT_FAMILIES.map((font) => (
                <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                  {font.value === 'inherit' ? (activeLanguage.code === 'pt' ? 'Sistema' : 'System') : font.label}
                </option>
              ))}
            </select>
            <ExpandMoreRoundedIcon fontSize="small" />
          </label>

          <label className="bf-text-config__size" aria-label={dictionary.textConfiguration.fontSize}>
            <select
              value={activeStyle.fontSize}
              onChange={(event) => patchStyle({ fontSize: Number(event.target.value) })}
              aria-label={dictionary.textConfiguration.fontSize}
            >
              {FONT_SIZES.map((fontSize) => (
                <option key={fontSize} value={fontSize}>
                  {fontSize}
                </option>
              ))}
            </select>
            <ExpandMoreRoundedIcon fontSize="small" />
          </label>

          <Divider orientation="vertical" flexItem className="bf-text-config__divider" />

          <div className="bf-text-config__styles">
            <Tooltip title={dictionary.textConfiguration.bold} arrow>
              <ButtonBase
                className={`bf-text-config__button ${activeStyle.bold ? 'bf-text-config__button--active' : ''}`}
                onClick={() => patchStyle({ bold: !activeStyle.bold })}
                aria-label={dictionary.textConfiguration.bold}
                aria-pressed={activeStyle.bold}
              >
                <FormatBoldRoundedIcon fontSize="small" />
              </ButtonBase>
            </Tooltip>

            <Tooltip title={dictionary.textConfiguration.italic} arrow>
              <ButtonBase
                className={`bf-text-config__button ${activeStyle.italic ? 'bf-text-config__button--active' : ''}`}
                onClick={() => patchStyle({ italic: !activeStyle.italic })}
                aria-label={dictionary.textConfiguration.italic}
                aria-pressed={activeStyle.italic}
              >
                <FormatItalicRoundedIcon fontSize="small" />
              </ButtonBase>
            </Tooltip>

            <Tooltip title={dictionary.textConfiguration.underline} arrow>
              <ButtonBase
                className={`bf-text-config__button ${activeStyle.underline ? 'bf-text-config__button--active' : ''}`}
                onClick={() => patchStyle({ underline: !activeStyle.underline })}
                aria-label={dictionary.textConfiguration.underline}
                aria-pressed={activeStyle.underline}
              >
                <FormatUnderlinedRoundedIcon fontSize="small" />
              </ButtonBase>
            </Tooltip>

            <Tooltip title={dictionary.textConfiguration.strikethrough} arrow>
              <ButtonBase
                className={`bf-text-config__button ${activeStyle.strikethrough ? 'bf-text-config__button--active' : ''}`}
                onClick={() => patchStyle({ strikethrough: !activeStyle.strikethrough })}
                aria-label={dictionary.textConfiguration.strikethrough}
                aria-pressed={activeStyle.strikethrough}
              >
                <FormatStrikethroughRoundedIcon fontSize="small" />
              </ButtonBase>
            </Tooltip>
          </div>

          <Divider orientation="vertical" flexItem className="bf-text-config__divider" />

          <ColorPicker
            compact
            label={activeStyle.color ? dictionary.textConfiguration.changeTextColor : dictionary.textConfiguration.chooseTextColor}
            value={activeStyle.color || null}
            presets={colorPresets}
            allowGradient={false}
            onChange={(color) => patchStyle({ color: color ?? '' })}
          />

          <Tooltip title={target === 'header' ? dictionary.textConfiguration.resetHeader : dictionary.textConfiguration.resetCells} arrow>
            <ButtonBase className="bf-text-config__button" onClick={resetActiveStyle} aria-label={dictionary.textConfiguration.resetFormatting}>
              <RestartAltRoundedIcon fontSize="small" />
            </ButtonBase>
          </Tooltip>
        </div>
      </Popover>

    </>
  );
};

export default TextConfigurationPopup;
