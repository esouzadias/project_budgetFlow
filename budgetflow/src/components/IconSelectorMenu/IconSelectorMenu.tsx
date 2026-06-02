import { useMemo, useRef, useState } from "react";
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
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";

import type { IconSelectorMenuProps } from "./IconSelectorMenu.types";
import "./IconSelectorMenu.style.less";

function getCategoryColor(categories: IconSelectorMenuProps["categories"], name: string) {
  return categories.find((category) => category.name === name)?.color ?? "#9aa0a6";
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
  showCategories = true,
  allowCustomImages = false,
  title = "Customize row",
  closeOnClickAway = false,
}: IconSelectorMenuProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [query, setQuery] = useState("");
  const [customAnchorEl, setCustomAnchorEl] = useState<HTMLElement | null>(null);
  const [customDraft, setCustomDraft] = useState(row?.color ?? colorPresets[0] ?? "#1a73e8");

  const customOpen = Boolean(customAnchorEl);
  const selectedColor = row?.color ?? colorPresets[0] ?? "#1a73e8";
  const customImageUrl = row?.iconImageUrl ?? null;

  const filteredIcons = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();

    if (!cleanQuery) return icons;

    return icons.filter((icon) => {
      return icon.label.toLowerCase().includes(cleanQuery) || icon.id.toLowerCase().includes(cleanQuery);
    });
  }, [icons, query]);

  const closeAll = () => {
    setCustomAnchorEl(null);
    onClose();
  };

  const closeCustom = () => {
    setCustomAnchorEl(null);
  };

  const commitCustomColor = (nextColor: string) => {
    onChange({ color: nextColor });
  };

  const handleImageUpload = (file: File | null) => {
    if (!file) return;

    const imageUrl = URL.createObjectURL(file);

    onChange({
      iconImageUrl: imageUrl,
    });
  };

  const clearCustomImage = () => {
    onChange({
      iconImageUrl: null,
    });
  };

  const handleClose = (_event: object, reason: "backdropClick" | "escapeKeyDown") => {
    if (!closeOnClickAway && reason === "backdropClick") {
      return;
    }

    setCustomAnchorEl(null);
    onClose();
  };

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={handleClose}
      disableRestoreFocus
      anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      transformOrigin={{ vertical: "top", horizontal: "left" }}
      PaperProps={{ sx: { p: 1.25, width: 480, borderRadius: 3 } }}
    >
      <div
        id="icon-selector-menu"
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <Stack spacing={1}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="subtitle2" fontWeight={800}>
              {title}
            </Typography>

            <IconButton size="small" onClick={closeAll}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>

          <Divider />

          {showCategories ? (
            <>
              <Stack spacing={0.75}>
                <Typography variant="caption" fontWeight={800} sx={{ opacity: 0.75 }}>
                  Categories
                </Typography>

                <Autocomplete
                  multiple
                  freeSolo
                  options={categories.map((category) => category.name)}
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
                      onKeyDown={(event) => {
                        if (event.key !== "Enter") return;

                        const target = event.target as HTMLInputElement;
                        const clean = target.value.trim();

                        if (!clean) return;

                        onCreateCategory(clean);
                      }}
                    />
                  )}
                />
              </Stack>

              <Divider />
            </>
          ) : null}

          <Stack spacing={0.75}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" fontWeight={800} sx={{ opacity: 0.75 }}>
                Icons
              </Typography>

              <TextField
                value={query}
                onChange={(event) => setQuery(event.target.value)}
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
                display: "grid",
                gridTemplateColumns: "repeat(8, 1fr)",
                gap: 1,
                maxHeight: 240,
                overflow: "auto",
                pr: 0.5,
              }}
            >
              {filteredIcons.map((icon) => {
                const selected = row?.iconId === icon.id && !customImageUrl;

                return (
                  <ButtonBase
                    key={icon.id}
                    onClick={() =>
                      onChange({
                        iconId: icon.id,
                        iconImageUrl: null,
                      })
                    }
                    sx={{
                      height: 44,
                      borderRadius: 2,
                      display: "grid",
                      placeItems: "center",
                      border: selected ? "2px solid rgba(26,115,232,0.9)" : "1px solid rgba(0,0,0,0.12)",
                      backgroundColor: selected ? "rgba(26,115,232,0.10)" : "transparent",
                      color: selectedColor,
                    }}
                  >
                    {icon.render({ fontSize: "small" })}
                  </ButtonBase>
                );
              })}
            </Box>
          </Stack>

          {allowCustomImages ? (
            <>
              <Divider />

              <Stack spacing={0.75}>
                <Typography variant="caption" fontWeight={800} sx={{ opacity: 0.75 }}>
                  Custom image
                </Typography>

                <Stack direction="row" alignItems="center" spacing={1}>
                  <ButtonBase
                    onClick={() => fileInputRef.current?.click()}
                    sx={{
                      width: 52,
                      height: 52,
                      borderRadius: 2,
                      overflow: "hidden",
                      border: customImageUrl ? "2px solid rgba(26,115,232,0.9)" : "1px dashed rgba(0,0,0,0.22)",
                      backgroundColor: customImageUrl ? "transparent" : "rgba(26,115,232,0.05)",
                    }}
                  >
                    {customImageUrl ? (
                      <img
                        src={customImageUrl}
                        alt=""
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                    ) : (
                      <Typography variant="caption" fontWeight={900}>
                        IMG
                      </Typography>
                    )}
                  </ButtonBase>

                  <ButtonBase className="bf-pill" onClick={() => fileInputRef.current?.click()}>
                    <Typography variant="caption" className="bf-pill__text">
                      Upload image
                    </Typography>
                  </ButtonBase>

                  {customImageUrl ? (
                    <IconButton size="small" onClick={clearCustomImage}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  ) : null}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(event) => {
                      handleImageUpload(event.target.files?.[0] ?? null);
                      event.target.value = "";
                    }}
                  />
                </Stack>
              </Stack>
            </>
          ) : null}

          <Divider />

          <Stack spacing={0.75}>
            <Typography variant="caption" fontWeight={800} sx={{ opacity: 0.75 }}>
              Colors
            </Typography>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(12, 1fr)",
                gap: 1,
              }}
            >
              {colorPresets.map((color) => {
                const selected = row?.color === color;

                return (
                  <ButtonBase
                    key={color}
                    onClick={() => onChange({ color })}
                    sx={{
                      width: 18,
                      height: 18,
                      borderRadius: 999,
                      backgroundColor: color,
                      border: selected ? "2px solid rgba(0,0,0,0.75)" : "1px solid rgba(0,0,0,0.18)",
                      boxShadow: selected ? "0 0 0 3px rgba(26,115,232,0.18)" : "none",
                    }}
                  />
                );
              })}

              <ButtonBase
                onClick={(event) => {
                  setCustomDraft(selectedColor);
                  setCustomAnchorEl(event.currentTarget);
                }}
                sx={{
                  width: 18,
                  height: 18,
                  borderRadius: 999,
                  border: "1px solid rgba(0,0,0,0.22)",
                  background: "conic-gradient(from 0deg, #ea4335, #fbbc05, #34a853, #00acc1, #a142f4, #ea4335)",
                }}
              />
            </Box>

            <Popover
              open={customOpen}
              anchorEl={customAnchorEl}
              onClose={closeCustom}
              disableRestoreFocus
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
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
                    onInput: (event) => {
                      setCustomDraft((event.target as HTMLInputElement).value);
                    },
                    onChange: (event) => {
                      const nextColor = (event.target as HTMLInputElement).value;

                      setCustomDraft(nextColor);
                      commitCustomColor(nextColor);
                    },
                  }}
                  sx={{
                    width: 220,
                    "& input": {
                      p: 0,
                      height: 44,
                      width: 200,
                      border: 0,
                      cursor: "pointer",
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