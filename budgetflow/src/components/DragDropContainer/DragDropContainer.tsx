import type { ReactNode } from "react";
import "./DragDropContainer.style.less";

import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import { Box, Typography } from "@mui/material";

type Props = {
  id: string;
  scope: string;
  title?: string;
  children: ReactNode;
  onMove: (sourceId: string, targetId: string) => void;
  headerRight?: ReactNode;
  className?: string;
};

type DragPayload = { scope: string; id: string };

let activeDrag: DragPayload | null = null;

const encodePayload = (payload: DragPayload) => `${payload.scope}:${payload.id}`;

const decodePayload = (raw: string): DragPayload | null => {
  const idx = raw.indexOf(":");
  if (idx <= 0) return null;
  const scope = raw.slice(0, idx);
  const id = raw.slice(idx + 1);
  if (!scope || !id) return null;
  return { scope, id };
};

const DragDropContainer = ({ id, scope, title, children, onMove, headerRight, className }: Props) => {
  const mime = `text/bf-ddc-id:${scope}`;
  const selector = `[data-bf-ddc="${scope}:${id}"]`;

  const getHost = () => document.querySelector(selector) as HTMLElement | null;

  const setHostClass = (cls: string, on: boolean) => {
    const el = getHost();
    if (!el) return;
    el.classList.toggle(cls, on);
  };

  const getSourceIdIfSameScope = (e: React.DragEvent): string | null => {
    if (activeDrag && activeDrag.scope === scope && activeDrag.id !== id) return activeDrag.id;

    const raw = e.dataTransfer.getData(mime) || e.dataTransfer.getData("text/plain");
    if (!raw) return null;

    const parsed = decodePayload(raw);
    if (!parsed) return null;
    if (parsed.scope !== scope) return null;
    if (parsed.id === id) return null;

    return parsed.id;
  };

  const onDragStart = (e: React.DragEvent) => {
    const payload: DragPayload = { scope, id };
    activeDrag = payload;

    e.dataTransfer.setData(mime, encodePayload(payload));
    e.dataTransfer.setData("text/plain", encodePayload(payload)); // fallback
    e.dataTransfer.effectAllowed = "move";

    setHostClass("bf-ddc--source-dragging", true);
  };

  const onDragEnd = () => {
    activeDrag = null;
    setHostClass("bf-ddc--source-dragging", false);
    setHostClass("bf-ddc--drop-target", false);
  };

  const onDragOver = (e: React.DragEvent) => {
    const sourceId = getSourceIdIfSameScope(e);
    if (!sourceId) return;

    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    setHostClass("bf-ddc--drop-target", true);

    // preview reorder (smooth)
    onMove(sourceId, id);
  };

  const onDragLeave = () => {
    setHostClass("bf-ddc--drop-target", false);
  };

  const onDrop = (e: React.DragEvent) => {
    const sourceId = getSourceIdIfSameScope(e);
    if (!sourceId) return;

    // IMPORTANT: commit final position immediately on drop
    e.preventDefault();
    setHostClass("bf-ddc--drop-target", false);

    onMove(sourceId, id);
  };

  return (
    <section
      data-bf-ddc={`${scope}:${id}`}
      className={`bf-ddc bf-bubble-surface bf-block ${className ?? ""}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <Box className="bf-ddc__header">
        <button
          type="button"
          className="bf-ddc__handle"
          draggable
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          aria-label="Drag"
        >
          <DragIndicatorIcon fontSize="small" />
        </button>

        {title ? (
          <Typography className="bf-ddc__title" variant="subtitle2">
            {title}
          </Typography>
        ) : (
          <div className="bf-ddc__title-spacer" />
        )}

        {headerRight ? <div className="bf-ddc__header-right">{headerRight}</div> : null}
      </Box>

      <div className="bf-ddc__content">{children}</div>
    </section>
  );
};

export default DragDropContainer;