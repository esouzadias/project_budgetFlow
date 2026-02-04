import { useMemo, useState } from 'react';
import {
  Autocomplete,
  Box,
  ButtonBase,
  Chip,
  Divider,
  IconButton,
  InputAdornment,
  Popover,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import type { IconSelectorMenuProps } from './IconSelectorMenu.types';
import './IconSelectorMenu.style.less';

function getCategoryColor(categories: IconSelectorMenuProps['categories'], name: string) {
  return categories.find((c) => c.name === name)?.color ?? '#9aa0a6';
}

export default function IconSelectorMenu({
  open,
  anchorEl,
  onClose,
  row,
  categories,
  onCreateCategory,
  icons,
  colorPresets,
  onChange,
}: IconSelectorMenuProps) {
  const [query, setQuery] = useState('');
  const [customAnchorEl, setCustomAnchorEl] = useState<HTMLElement | null>(null);
  const customOpen = Boolean(customAnchorEl);
  const selectedColor = row?.color ?? colorPresets[0] ?? '#1a73e8';
  const [customDraft, setCustomDraft] = useState<string>(selectedColor);

  const filteredIcons = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return icons;
    return icons.filter((i) => i.label.toLowerCase().includes(q) || i.id.toLowerCase().includes(q));
  }, [icons, query]);

  function closeAll() {
    setCustomAnchorEl(null);
    onClose();
  }

  function closeCustom() {
    setCustomAnchorEl(null);
  }

  function commitCustomColor(next: string) {
    onChange({ color: next });
  }

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={() => {
        setCustomAnchorEl(null);
        onClose();
      }}
      disableRestoreFocus
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      PaperProps={{ sx: { p: 1.25, width: 480, borderRadius: 3 } }}
    >
      <div id="icon-selector-menu">
        <Stack spacing={1}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="subtitle2" fontWeight={800}>
              Customize row
            </Typography>

            <IconButton size="small" onClick={closeAll}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
          <Divider />
          <Stack spacing={0.75}>
            <Typography variant="caption" fontWeight={800} sx={{ opacity: 0.75 }}>
              Categories
            </Typography>
            <Autocomplete
              multiple
              freeSolo
              options={categories.map((c) => c.name)}
              value={row?.categories ?? []}
              onChange={(_, value) => onChange({ categories: value.map(String) })}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => {
                  const color = getCategoryColor(categories, option);
                  return (
                    <Chip
                      {...getTagProps({ index })}
                      key={option}
                      label={option}
                      size="small"
                      sx={{
                        borderRadius: 999,
                        backgroundColor: `${color}22`,
                        border: `1px solid ${color}55`,
                      }}
                    />
                  );
                })
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  placeholder="Add categories…"
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter') return;
                    const target = e.target as HTMLInputElement;
                    const clean = target.value.trim();
                    if (!clean) return;
                    onCreateCategory(clean);
                  }}
                />
              )}
            />
          </Stack>
          <Divider />
          <Stack spacing={0.75}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" fontWeight={800} sx={{ opacity: 0.75 }}>
                Icons
              </Typography>
              <TextField
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                size="small"
                placeholder="Search icon…"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
                sx={{ width: 240 }}
              />
            </Stack>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(8, 1fr)',
                gap: 1,
                maxHeight: 240,
                overflow: 'auto',
                pr: 0.5,
              }}
            >
              {filteredIcons.map((icon) => {
                const selected = row?.iconId === icon.id;

                return (
                  <ButtonBase
                    key={icon.id}
                    onClick={() => onChange({ iconId: icon.id })}
                    sx={{
                      height: 44,
                      borderRadius: 2,
                      display: 'grid',
                      placeItems: 'center',
                      border: selected ? '2px solid rgba(26,115,232,0.9)' : '1px solid rgba(0,0,0,0.12)',
                      backgroundColor: selected ? 'rgba(26,115,232,0.10)' : 'transparent',
                      color: selectedColor,
                    }}
                  >
                    {icon.render({ fontSize: 'small' })}
                  </ButtonBase>
                );
              })}
            </Box>
          </Stack>
          <Divider />
          <Stack spacing={0.75}>
            <Typography variant="caption" fontWeight={800} sx={{ opacity: 0.75 }}>
              Colors
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(12, 1fr)',
                gap: 1,
              }}
            >
              {colorPresets.map((c) => {
                const selected = row?.color === c;

                return (
                  <ButtonBase
                    key={c}
                    onClick={() => onChange({ color: c })}
                    sx={{
                      width: 18,
                      height: 18,
                      borderRadius: 999,
                      backgroundColor: c,
                      border: selected ? '2px solid rgba(0,0,0,0.75)' : '1px solid rgba(0,0,0,0.18)',
                      boxShadow: selected ? '0 0 0 3px rgba(26,115,232,0.18)' : 'none',
                    }}
                  />
                );
              })}
              <ButtonBase
                onClick={(e) => {
                  setCustomDraft(selectedColor);
                  setCustomAnchorEl(e.currentTarget);
                }}
                sx={{
                  width: 18,
                  height: 18,
                  borderRadius: 999,
                  border: '1px solid rgba(0,0,0,0.22)',
                  background:
                    'conic-gradient(from 0deg, #ea4335, #fbbc05, #34a853, #00acc1, #a142f4, #ea4335)',
                }}
              />
            </Box>
            <Popover
              open={customOpen}
              anchorEl={customAnchorEl}
              onClose={closeCustom}
              disableRestoreFocus
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              PaperProps={{ sx: { p: 1.25, borderRadius: 3 } }}
            >
              <Stack spacing={1}>
                <Typography variant="caption" fontWeight={800} sx={{ opacity: 0.75 }}>
                  Custom color
                </Typography>
                <TextField
                  type="color"
                  value={customDraft}
                  inputProps={{
                    onInput: (e) => {
                      setCustomDraft((e.target as HTMLInputElement).value);
                    },
                    onChange: (e) => {
                      const next = (e.target as HTMLInputElement).value;
                      setCustomDraft(next);
                      commitCustomColor(next);
                    },
                  }}
                  sx={{
                    width: 220,
                    '& input': {
                      p: 0,
                      height: 44,
                      width: 200,
                      border: 0,
                      cursor: 'pointer',
                    },
                  }}
                />
              </Stack>
            </Popover>
          </Stack>
        </Stack>
      </div>
    </Popover>
  );
}