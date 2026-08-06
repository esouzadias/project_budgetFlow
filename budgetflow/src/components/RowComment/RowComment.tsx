import { useLayoutEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";

import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import ChatBubbleRoundedIcon from "@mui/icons-material/ChatBubbleRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { IconButton, Popover, Tooltip } from "@mui/material";

import GenericInput from "../GenericInput/GenericInput";
import { useLanguage } from "../../localization/useLanguage";

import "./RowComment.styles.less";

type RowCommentProps = {
  value: string;
  rowLabel: string;
  color?: string;
  onSave: (nextValue: string) => void;
};

const COMMENT_VERTICAL_OFFSET = 18;
const ESTIMATED_COMMENT_HEIGHT = 230;

const shouldOpenCommentAbove = (anchorRect: DOMRect, commentHeight = ESTIMATED_COMMENT_HEIGHT) => {
  const spaceAbove = anchorRect.top;
  const spaceBelow = window.innerHeight - anchorRect.bottom;

  return spaceBelow < commentHeight + COMMENT_VERTICAL_OFFSET + 12 && spaceAbove > spaceBelow;
};

const RowComment = ({ value, rowLabel, color, onSave }: RowCommentProps) => {
  const { activeLanguage } = useLanguage();
  const dictionary = activeLanguage.dictionary;
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [draft, setDraft] = useState(value);
  const [opensAbove, setOpensAbove] = useState(false);
  const popoverPaperRef = useRef<HTMLDivElement | null>(null);

  const open = Boolean(anchorEl);
  const hasComment = value.trim().length > 0;
  const normalizedDraft = draft.trim();
  const hasChanges = normalizedDraft !== value.trim();
  const resolvedRowLabel = rowLabel.trim() || dictionary.comments.row;

  const openComment = (event: MouseEvent<HTMLButtonElement>) => {
    setDraft(value);
    setOpensAbove(shouldOpenCommentAbove(event.currentTarget.getBoundingClientRect()));
    setAnchorEl(event.currentTarget);
  };

  const closeComment = () => {
    setDraft(value);
    setAnchorEl(null);
  };

  const saveComment = () => {
    if (hasChanges) onSave(normalizedDraft);
    setAnchorEl(null);
  };

  const removeComment = () => {
    onSave("");
    setDraft("");
    setAnchorEl(null);
  };

  const preview = hasComment ? value : dictionary.comments.addTo;
  const style = {
    "--bf-row-comment-color": color || "var(--bf-primary)",
  } as CSSProperties;

  useLayoutEffect(() => {
    if (!open || !anchorEl) return;

    let animationFrame = 0;
    let resizeObserver: ResizeObserver | null = null;

    const updatePopoverPosition = () => {
      const paper = popoverPaperRef.current;
      if (!paper) return;

      const anchorRect = anchorEl.getBoundingClientRect();
      const paperRect = paper.getBoundingClientRect();
      const anchorCenter = anchorRect.left + anchorRect.width / 2;
      const safeTailPosition = Math.min(
        Math.max(anchorCenter - paperRect.left, 28),
        paperRect.width - 28,
      );

      paper.style.setProperty("--bf-row-comment-tail-x", `${safeTailPosition}px`);
      setOpensAbove((currentPlacement) => {
        const nextPlacement = shouldOpenCommentAbove(anchorRect, paperRect.height);
        return currentPlacement === nextPlacement ? currentPlacement : nextPlacement;
      });
    };

    const scheduleAlignment = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(updatePopoverPosition);
    };

    animationFrame = window.requestAnimationFrame(() => {
      updatePopoverPosition();
      animationFrame = window.requestAnimationFrame(updatePopoverPosition);
    });

    window.addEventListener("resize", scheduleAlignment);
    resizeObserver = new ResizeObserver(scheduleAlignment);

    if (popoverPaperRef.current) {
      resizeObserver.observe(popoverPaperRef.current);
    }

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", scheduleAlignment);
      resizeObserver?.disconnect();
    };
  }, [anchorEl, open, opensAbove]);

  return (
    <span className={`bf-row-comment ${hasComment ? "bf-row-comment--filled" : ""}`} style={style}>
      <Tooltip title={preview} enterDelay={280} disableHoverListener={open} arrow>
        <IconButton
          type="button"
          size="small"
          className="bf-icon-btn bf-row-comment__trigger"
          aria-label={hasComment ? `${dictionary.comments.editFor} ${resolvedRowLabel}` : `${dictionary.comments.addTo} ${resolvedRowLabel}`}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={openComment}
        >
          {hasComment ? <ChatBubbleRoundedIcon fontSize="small" /> : <ChatBubbleOutlineRoundedIcon fontSize="small" />}
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={saveComment}
        disableRestoreFocus
        marginThreshold={12}
        anchorOrigin={{ vertical: opensAbove ? "top" : "bottom", horizontal: "center" }}
        transformOrigin={{ vertical: opensAbove ? "bottom" : "top", horizontal: "center" }}
        transitionDuration={{ enter: 0, exit: 180 }}
        PaperProps={{
          ref: popoverPaperRef,
          className: `bf-row-comment__popover bf-row-comment__popover--${opensAbove ? "above" : "below"}`,
          style,
          role: "dialog",
          "aria-label": `${dictionary.comments.comment}: ${resolvedRowLabel}`,
        }}
      >
        <span className="bf-row-comment__thought-tail" aria-hidden="true">
          <i />
          <i />
        </span>

        <div className="bf-row-comment__surface">
          <div className="bf-row-comment__glow" aria-hidden="true" />

          <header className="bf-row-comment__header">
            <span className="bf-row-comment__header-icon">
              <ChatBubbleRoundedIcon fontSize="small" />
            </span>

            <div className="bf-row-comment__heading">
              <span>{dictionary.comments.comment}</span>
              <strong>{resolvedRowLabel}</strong>
            </div>

            <Tooltip title={dictionary.comments.closeWithoutSaving} enterDelay={250}>
              <IconButton
                type="button"
                size="small"
                className="bf-row-comment__close"
                aria-label={dictionary.comments.closeWithoutSaving}
                onClick={closeComment}
              >
                <CloseRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </header>

          <GenericInput
            value={draft}
            onValueChange={setDraft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                closeComment();
                return;
              }

              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                saveComment();
              }
            }}
            placeholder={`${dictionary.comments.placeholderPrefix} ${resolvedRowLabel}…`}
            autoFocus
            multiline
            minRows={3}
            maxRows={7}
            fullWidth
            inputProps={{ maxLength: 600 }}
            className="bf-row-comment__input"
          />

          <footer className="bf-row-comment__footer">
            <div className="bf-row-comment__meta">
              <span>{dictionary.comments.saveShortcut}</span>
              {draft.length >= 480 ? <small>{draft.length}/600</small> : null}
            </div>

            <div className="bf-row-comment__actions">
              {hasComment ? (
                <Tooltip title={dictionary.comments.remove} enterDelay={250}>
                  <IconButton
                    type="button"
                    size="small"
                    className="bf-row-comment__remove"
                    aria-label={dictionary.comments.remove}
                    onClick={removeComment}
                  >
                    <DeleteOutlineRoundedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              ) : null}

              <Tooltip title={dictionary.comments.save} enterDelay={250}>
                <span>
                  <IconButton
                    type="button"
                    size="small"
                    className="bf-row-comment__save"
                    aria-label={dictionary.comments.save}
                    disabled={!hasChanges}
                    onClick={saveComment}
                  >
                    <CheckRoundedIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </div>
          </footer>
        </div>
      </Popover>
    </span>
  );
};

export default RowComment;
