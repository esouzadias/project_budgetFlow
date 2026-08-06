import type { CSSProperties, ReactNode } from "react";
import "./DragDropContainer.style.less";

import { Box, Typography } from "@mui/material";
import { useLanguage } from "../../localization/useLanguage";

export type DropIntent = "before" | "after" | "side-before" | "side-after";

type Props = {
  id: string;
  scope: string;
  title?: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  onDragStartBlock?: (id: string) => void;
  onDragEndBlock?: () => void;
};

type DragPayload = { scope: string; id: string };

const encodePayload = (payload: DragPayload) => `${payload.scope}:${payload.id}`;

const DragDropContainer = ({ id, scope, title, children, className, style, onDragStartBlock, onDragEndBlock }: Props) => {
  const { activeLanguage } = useLanguage();
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
    <section data-bf-ddc={`${scope}:${id}`} className={`bf-ddc bf-bubble-surface bf-block ${className ?? ""}`} style={style}>
      <Box
        className="bf-ddc__header"
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        role="button"
        tabIndex={0}
        aria-label={`${activeLanguage.dictionary.grid.drag} ${title ?? activeLanguage.dictionary.grid.dashboardBlock}`}
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
