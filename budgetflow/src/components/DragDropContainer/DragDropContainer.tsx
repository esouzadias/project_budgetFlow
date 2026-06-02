import type { ReactNode } from "react";
import "./DragDropContainer.style.less";

import { Box, Typography } from "@mui/material";

export type DropIntent = "before" | "after" | "side-before" | "side-after";

type Props = {
  id: string;
  scope: string;
  title?: string;
  children: ReactNode;
  className?: string;
  onDragStartBlock?: (id: string) => void;
  onDragEndBlock?: () => void;
};

type DragPayload = { scope: string; id: string };

const encodePayload = (payload: DragPayload) => `${payload.scope}:${payload.id}`;

const DragDropContainer = ({ id, scope, title, children, className, onDragStartBlock, onDragEndBlock }: Props) => {
  const mime = `text/bf-ddc-id:${scope}`;

  const onDragStart = (event: React.DragEvent) => {
    const payload: DragPayload = { scope, id };

    event.dataTransfer.setData(mime, encodePayload(payload));
    event.dataTransfer.setData("text/plain", encodePayload(payload));
    event.dataTransfer.effectAllowed = "move";

    onDragStartBlock?.(id);
  };

  const onDragEnd = () => {
    onDragEndBlock?.();
  };

  return (
    <section data-bf-ddc={`${scope}:${id}`} className={`bf-ddc bf-bubble-surface bf-block ${className ?? ""}`}>
      <Box
        className="bf-ddc__header"
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        role="button"
        tabIndex={0}
        aria-label={`Drag ${title ?? "dashboard block"}`}
      >
        {title ? (
          <Typography className="bf-ddc__title" variant="subtitle2">
            {title}
          </Typography>
        ) : null}
      </Box>

      <div className="bf-ddc__content">{children}</div>
    </section>
  );
};

export default DragDropContainer;