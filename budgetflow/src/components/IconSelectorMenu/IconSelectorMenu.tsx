import { useEffect, useMemo, useRef, useState } from "react";
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
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import LinkIcon from "@mui/icons-material/Link";
import AddPhotoAlternateRoundedIcon from "@mui/icons-material/AddPhotoAlternateRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";

import ColorPicker from "../ColorPicker/ColorPicker";
import GenericInput from "../GenericInput/GenericInput";
import { useLanguage } from "../../localization/useLanguage";

import type { IconSelectorMenuProps } from "./IconSelectorMenu.types";
import "./IconSelectorMenu.style.less";

type RecentUploadedImage = {
  id: string;
  url: string;
  label: string;
  source: "file" | "url";
  createdAt: number;
};

const RECENT_UPLOADS_STORAGE_KEY = "budgetflow_recent_uploaded_icons";
const MAX_RECENT_UPLOADS = 18;

function getCategoryColor(categories: IconSelectorMenuProps["categories"], name: string) {
  return categories.find((category) => category.name === name)?.color ?? "#9aa0a6";
}

const createId = () => crypto.randomUUID();

const isValidImageUrl = (value: string) => {
  const cleanValue = value.trim();

  if (!cleanValue) return false;
  if (cleanValue.startsWith("data:image/")) return true;
  if (cleanValue.startsWith("blob:")) return true;

  try {
    const parsedUrl = new URL(cleanValue);
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
  } catch {
    return false;
  }
};

const loadRecentUploadedImages = (): RecentUploadedImage[] => {
  try {
    const rawValue = window.localStorage.getItem(RECENT_UPLOADS_STORAGE_KEY);
    if (!rawValue) return [];

    const parsedValue = JSON.parse(rawValue) as RecentUploadedImage[];

    if (!Array.isArray(parsedValue)) return [];

    return parsedValue.filter((item) => {
      return Boolean(item?.id && item?.url && item?.label && item?.createdAt);
    });
  } catch {
    return [];
  }
};

const saveRecentUploadedImages = (images: RecentUploadedImage[]) => {
  try {
    window.localStorage.setItem(RECENT_UPLOADS_STORAGE_KEY, JSON.stringify(images));
  } catch {
    // localStorage can fail if image data is too large.
  }
};

const getUrlLabel = (value: string, fallbackLabel: string) => {
  try {
    const parsedUrl = new URL(value);
    const lastSegment = parsedUrl.pathname.split("/").filter(Boolean).at(-1);

    return lastSegment || parsedUrl.hostname;
  } catch {
    return fallbackLabel;
  }
};

const createCompressedImageDataUrl = (file: File, maxSize = 48): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const image = new Image();

    reader.onerror = () => reject(new Error("Could not read image file."));

    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Invalid image file."));
        return;
      }

      image.onload = () => {
        const ratio = Math.min(maxSize / image.width, maxSize / image.height, 1);
        const width = Math.max(1, Math.round(image.width * ratio));
        const height = Math.max(1, Math.round(image.height * ratio));

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext("2d");

        if (!context) {
          reject(new Error("Could not process image."));
          return;
        }

        context.clearRect(0, 0, width, height);
        context.drawImage(image, 0, 0, width, height);

        const webpDataUrl = canvas.toDataURL("image/webp", 0.55);

        if (webpDataUrl.startsWith("data:image/webp")) {
          resolve(webpDataUrl);
          return;
        }

        resolve(canvas.toDataURL("image/jpeg", 0.55));
      };

      image.onerror = () => reject(new Error("Could not load image."));
      image.src = reader.result;
    };

    reader.readAsDataURL(file);
  });
};

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
  allowCustomImages = true,
  title,
  closeOnClickAway = false,
}: IconSelectorMenuProps) {
  const { activeLanguage } = useLanguage();
  const dictionary = activeLanguage.dictionary.iconSelector;
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [query, setQuery] = useState("");
  const [localImageAnchorEl, setLocalImageAnchorEl] = useState<HTMLElement | null>(null);
  const [imageUrlAnchorEl, setImageUrlAnchorEl] = useState<HTMLElement | null>(null);
  const [imageUrlDraft, setImageUrlDraft] = useState(row?.iconImageUrl ?? "");
  const [recentUploadedImages, setRecentUploadedImages] = useState<RecentUploadedImage[]>(() => loadRecentUploadedImages());

  const localImageOpen = Boolean(localImageAnchorEl);
  const imageUrlOpen = Boolean(imageUrlAnchorEl);

  const selectedColor = row?.color ?? colorPresets[0] ?? "#1a73e8";
  const customImageUrl = row?.iconImageUrl ?? null;
  const cleanImageUrlDraft = imageUrlDraft.trim();
  const imageUrlIsInvalid = cleanImageUrlDraft.length > 0 && !isValidImageUrl(cleanImageUrlDraft);

  useEffect(() => {
    if (!open) return;

    setImageUrlDraft(row?.iconImageUrl ?? "");
    setRecentUploadedImages(loadRecentUploadedImages());
  }, [open, row?.iconImageUrl]);

  const filteredIcons = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();

    if (!cleanQuery) return icons;

    return icons.filter((icon) => {
      return icon.label.toLowerCase().includes(cleanQuery) || icon.id.toLowerCase().includes(cleanQuery);
    });
  }, [icons, query]);

  const persistRecentImages = (nextImages: RecentUploadedImage[]) => {
    setRecentUploadedImages(nextImages);
    saveRecentUploadedImages(nextImages);
  };

  const addRecentUploadedImage = (image: Omit<RecentUploadedImage, "id" | "createdAt">) => {
    const cleanUrl = image.url.trim();

    if (!cleanUrl) return;

    const nextImage: RecentUploadedImage = {
      id: createId(),
      url: cleanUrl,
      label: image.label.trim() || dictionary.uploadedImage,
      source: image.source,
      createdAt: Date.now(),
    };

    const nextImages = [
      nextImage,
      ...recentUploadedImages.filter((item) => item.url !== cleanUrl),
    ].slice(0, MAX_RECENT_UPLOADS);

    persistRecentImages(nextImages);
  };

  const removeRecentUploadedImage = (imageId: string) => {
    const nextImages = recentUploadedImages.filter((image) => image.id !== imageId);
    persistRecentImages(nextImages);
  };

  const applyCustomImage = (imageUrl: string) => {
    onChange({
      iconId: "other",
      iconImageUrl: imageUrl,
    });

    setImageUrlDraft(imageUrl);
  };

  const closeAll = () => {
    setLocalImageAnchorEl(null);
    setImageUrlAnchorEl(null);
    onClose();
  };

  const closeLocalImagePopup = () => {
    setLocalImageAnchorEl(null);
  };

  const closeImageUrlPopup = () => {
    setImageUrlAnchorEl(null);
    setImageUrlDraft(row?.iconImageUrl ?? "");
  };

  const handleImageUpload = async (file: File | null) => {
    if (!file) return;

    try {
      const imageUrl = await createCompressedImageDataUrl(file, 48);

      applyCustomImage(imageUrl);

      addRecentUploadedImage({
        url: imageUrl,
        label: file.name || dictionary.localImage,
        source: "file",
      });
    } finally {
      setLocalImageAnchorEl(null);
    }
  };

  const commitImageUrl = () => {
    const cleanUrl = imageUrlDraft.trim();

    if (!isValidImageUrl(cleanUrl)) return;

    applyCustomImage(cleanUrl);

    addRecentUploadedImage({
      url: cleanUrl,
      label: getUrlLabel(cleanUrl, dictionary.imageUrl),
      source: "url",
    });

    setImageUrlAnchorEl(null);
  };

  const clearCustomImage = () => {
    onChange({
      iconImageUrl: null,
    });

    setImageUrlDraft("");
  };

  const handleClose = (_event: object, reason: "backdropClick" | "escapeKeyDown") => {
    if (!closeOnClickAway && reason === "backdropClick") {
      return;
    }

    setLocalImageAnchorEl(null);
    setImageUrlAnchorEl(null);
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
      <div id="icon-selector-menu" onMouseDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}>
        <Stack spacing={1}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="subtitle2" fontWeight={800}>
              {title ?? dictionary.customizeRow}
            </Typography>

            <IconButton size="small" onClick={closeAll} aria-label={activeLanguage.dictionary.common.close}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>

          <Divider />

          {showCategories ? (
            <>
              <Stack spacing={0.75}>
                <Typography variant="caption" fontWeight={800} sx={{ opacity: 0.75 }}>
                  {dictionary.categories}
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
                    <GenericInput
                      {...params}
                      size="small"
                      placeholder={dictionary.addCategories}
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

          <Stack spacing={1}>
            <Typography variant="caption" fontWeight={800} sx={{ opacity: 0.75 }}>
              {dictionary.icons}
            </Typography>

            <GenericInput
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              size="small"
              placeholder={dictionary.searchIcon}
              className="ism-icon-search"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
              fullWidth
            />

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
                      border: selected ? "2px solid var(--bf-primary)" : "1px solid var(--bf-border)",
                      backgroundColor: selected ? "color-mix(in srgb, var(--bf-primary) 10%, transparent)" : "transparent",
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

              <Stack spacing={0.85}>
                <Typography variant="caption" fontWeight={800} sx={{ opacity: 0.75 }}>
                  {dictionary.customImage}
                </Typography>

                <Stack spacing={1}>
                  <ButtonBase
                    onClick={(event) => setLocalImageAnchorEl(event.currentTarget)}
                    sx={{
                      width: "100%",
                      minHeight: 58,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-start",
                      gap: 1.5,
                      px: 1.5,
                      py: 1,
                      borderRadius: 2.25,
                      border: "1px solid rgba(0,0,0,0.12)",
                      backgroundColor: localImageOpen
                        ? "color-mix(in srgb, var(--bf-primary) 8%, transparent)"
                        : "color-mix(in srgb, var(--bf-text) 1.5%, transparent)",
                      textAlign: "left",
                      transition: "transform 120ms ease, background-color 120ms ease, border-color 120ms ease",
                      "&:hover": {
                        transform: "translateY(-1px)",
                        backgroundColor: "color-mix(in srgb, var(--bf-primary) 7%, transparent)",
                        borderColor: "color-mix(in srgb, var(--bf-primary) 34%, transparent)",
                      },
                    }}
                  >
                    <Box
                      sx={{
                        width: 42,
                        height: 42,
                        flex: "0 0 42px",
                        borderRadius: 1.5,
                        overflow: "hidden",
                        display: "grid",
                        placeItems: "center",
                        color: selectedColor,
                        backgroundColor: "color-mix(in srgb, var(--bf-primary) 8%, transparent)",
                        border: "1px solid color-mix(in srgb, var(--bf-primary) 18%, transparent)",
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
                        <AddPhotoAlternateRoundedIcon fontSize="small" />
                      )}
                    </Box>

                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={900} sx={{ lineHeight: 1.15 }}>
                        {dictionary.browseFiles}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>
                        {dictionary.chooseFromDevice}
                      </Typography>
                    </Box>
                  </ButtonBase>

                  <ButtonBase
                    onClick={(event) => {
                      setImageUrlDraft(row?.iconImageUrl ?? "");
                      setImageUrlAnchorEl(event.currentTarget);
                    }}
                    sx={{
                      width: "100%",
                      minHeight: 58,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-start",
                      gap: 1.5,
                      px: 1.5,
                      py: 1,
                      borderRadius: 2.25,
                      border: "1px solid rgba(0,0,0,0.12)",
                      backgroundColor: imageUrlOpen
                        ? "color-mix(in srgb, var(--bf-primary) 8%, transparent)"
                        : "color-mix(in srgb, var(--bf-text) 1.5%, transparent)",
                      textAlign: "left",
                      transition: "transform 120ms ease, background-color 120ms ease, border-color 120ms ease",
                      "&:hover": {
                        transform: "translateY(-1px)",
                        backgroundColor: "color-mix(in srgb, var(--bf-primary) 7%, transparent)",
                        borderColor: "color-mix(in srgb, var(--bf-primary) 34%, transparent)",
                      },
                    }}
                  >
                    <Box
                      sx={{
                        width: 42,
                        height: 42,
                        flex: "0 0 42px",
                        borderRadius: 1.5,
                        display: "grid",
                        placeItems: "center",
                        color: selectedColor,
                        backgroundColor: "color-mix(in srgb, var(--bf-primary) 8%, transparent)",
                        border: "1px solid color-mix(in srgb, var(--bf-primary) 18%, transparent)",
                      }}
                    >
                      <LinkIcon fontSize="small" />
                    </Box>

                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={900} sx={{ lineHeight: 1.15 }}>
                        {dictionary.uploadWithUrl}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>
                        {dictionary.pasteImageLink}
                      </Typography>
                    </Box>
                  </ButtonBase>

                  {customImageUrl ? (
                    <ButtonBase
                      onClick={clearCustomImage}
                      sx={{
                        alignSelf: "flex-start",
                        height: 32,
                        px: 1.5,
                        borderRadius: 999,
                        color: "error.main",
                        backgroundColor: "rgba(234,67,53,0.07)",
                        border: "1px solid rgba(234,67,53,0.22)",
                      }}
                    >
                      <Typography variant="caption" fontWeight={900}>
                        {dictionary.removeCustomImage}
                      </Typography>
                    </ButtonBase>
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

                {recentUploadedImages.length > 0 ? (
                  <>
                    <Divider />

                    <Stack spacing={0.75}>
                      <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Typography variant="caption" fontWeight={800} sx={{ opacity: 0.75 }}>
                          {dictionary.recentUploads}
                        </Typography>

                        <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 800 }}>
                          {recentUploadedImages.length}
                        </Typography>
                      </Stack>

                      <Box
                        sx={{
                          display: "grid",
                          gridTemplateColumns: "repeat(6, 1fr)",
                          gap: 1,
                        }}
                      >
                        {recentUploadedImages.map((image) => {
                          const selected = customImageUrl === image.url;

                          return (
                            <Box key={image.id} sx={{ position: "relative" }}>
                              <ButtonBase
                                onClick={() => applyCustomImage(image.url)}
                                sx={{
                                  width: "100%",
                                  aspectRatio: "1 / 1",
                                  borderRadius: 2,
                                  overflow: "hidden",
                                  border: selected ? "2px solid var(--bf-primary)" : "1px solid var(--bf-border)",
                                  backgroundColor: "rgba(0,0,0,0.04)",
                                  display: "block",
                                }}
                              >
                                <img
                                  src={image.url}
                                  alt={image.label}
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                    display: "block",
                                  }}
                                />
                              </ButtonBase>

                              <IconButton
                                size="small"
                                aria-label={dictionary.removeRecentImage}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  removeRecentUploadedImage(image.id);
                                }}
                                sx={{
                                  position: "absolute",
                                  top: -7,
                                  right: -7,
                                  width: 22,
                                  height: 22,
                                  color: "error.main",
                                  backgroundColor: "background.paper",
                                  border: "1px solid rgba(0,0,0,0.12)",
                                  boxShadow: "0 4px 10px rgba(0,0,0,0.14)",
                                  "&:hover": {
                                    backgroundColor: "rgba(234,67,53,0.10)",
                                  },
                                }}
                              >
                                <DeleteOutlineRoundedIcon sx={{ fontSize: 14 }} />
                              </IconButton>
                            </Box>
                          );
                        })}
                      </Box>
                    </Stack>
                  </>
                ) : null}

                <Popover
                  open={localImageOpen}
                  anchorEl={localImageAnchorEl}
                  onClose={closeLocalImagePopup}
                  disableRestoreFocus
                  anchorOrigin={{ vertical: "center", horizontal: "right" }}
                  transformOrigin={{ vertical: "center", horizontal: "left" }}
                  PaperProps={{ sx: { p: 2, width: 420, borderRadius: 3 } }}
                >
                  <ButtonBase
                    onClick={() => fileInputRef.current?.click()}
                    sx={{
                      width: "100%",
                      minHeight: 170,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexDirection: "column",
                      gap: 1,
                      borderRadius: 3,
                      backgroundColor: "rgba(0,0,0,0.10)",
                      border: "1px dashed rgba(0,0,0,0.18)",
                      transition: "background-color 140ms ease, border-color 140ms ease, transform 140ms ease",
                      "&:hover": {
                        transform: "translateY(-1px)",
                        backgroundColor: "color-mix(in srgb, var(--bf-primary) 8%, transparent)",
                        borderColor: "color-mix(in srgb, var(--bf-primary) 34%, transparent)",
                      },
                    }}
                  >
                    <AddPhotoAlternateRoundedIcon sx={{ fontSize: 46, color: selectedColor }} />

                    <Typography variant="body1" fontWeight={900}>
                      {dictionary.browseFiles}
                    </Typography>

                    <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>
                      {dictionary.clickToChoose}
                    </Typography>
                  </ButtonBase>
                </Popover>

                <Popover
                  open={imageUrlOpen}
                  anchorEl={imageUrlAnchorEl}
                  onClose={closeImageUrlPopup}
                  disableRestoreFocus
                  anchorOrigin={{ vertical: "center", horizontal: "right" }}
                  transformOrigin={{ vertical: "center", horizontal: "left" }}
                  PaperProps={{ sx: { p: 2, width: 420, borderRadius: 3 } }}
                >
                  <Stack spacing={1.25}>
                    <Typography variant="body1" fontWeight={900}>
                      {dictionary.uploadWithUrl}
                    </Typography>

                    <GenericInput
                      value={imageUrlDraft}
                      onChange={(event) => setImageUrlDraft(event.target.value)}
                      onBlur={() => {
                        if (isValidImageUrl(imageUrlDraft)) {
                          commitImageUrl();
                        }
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          commitImageUrl();
                        }

                        if (event.key === "Escape") {
                          event.preventDefault();
                          closeImageUrlPopup();
                        }
                      }}
                      size="small"
                      fullWidth
                      autoFocus
                      placeholder={dictionary.typeUrl}
                      error={imageUrlIsInvalid}
                      helperText={imageUrlIsInvalid ? dictionary.invalidUrl : dictionary.pressEnter}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <LinkIcon fontSize="small" />
                          </InputAdornment>
                        ),
                      }}
                      sx={{
                        "& .MuiInputBase-root": {
                          minHeight: 64,
                          borderRadius: 2,
                          backgroundColor: "color-mix(in srgb, var(--bf-primary) 8%, transparent)",
                        },
                        "& input": {
                          fontSize: 18,
                          fontWeight: 800,
                        },
                      }}
                    />
                  </Stack>
                </Popover>
              </Stack>
            </>
          ) : null}

          <Divider />

          <Stack spacing={0.75}>
            <Typography variant="caption" fontWeight={800} sx={{ opacity: 0.75 }}>
              {dictionary.colors}
            </Typography>

            <ColorPicker
              inline
              label={dictionary.iconColor}
              value={selectedColor}
              presets={colorPresets}
              allowAuto={false}
              allowGradient={false}
              onChange={(color) => {
                if (color) onChange({ color });
              }}
            />
          </Stack>
        </Stack>
      </div>
    </Popover>
  );
}
