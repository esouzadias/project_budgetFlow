import "./DashboardGrid.style.less";

import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import KeyboardArrowUpRoundedIcon from "@mui/icons-material/KeyboardArrowUpRounded";

import DragDropContainer, { type DropIntent } from "../../../components/DragDropContainer/DragDropContainer";
import { useLanguage } from "../../../localization/useLanguage";

export type DashboardBlockSpan = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export type DashboardGridLayoutItem = {
  id: string;
  span: DashboardBlockSpan;
};

export type DashboardGridBlock = {
  id: string;
  title: string;
  content: ReactNode;
  defaultSpan?: DashboardBlockSpan;
  bare?: boolean;
  resizable?: boolean;
  surfaceStyle?: CSSProperties;
};

type DashboardLayoutBlock = {
  id: string;
  span: DashboardBlockSpan;
};

type GridRow = {
  top: number;
  bottom: number;
  height: number;
  elements: HTMLElement[];
};

type DropPreview = {
  targetId: string;
  intent: DropIntent;
  style: CSSProperties;
};

type DashboardGridProps = {
  blocks: DashboardGridBlock[];
  onLayoutChange?: (layout: DashboardGridLayoutItem[]) => void;
};

const GRID_GAP = 12;
const GRID_COLUMNS = 12;
const MIN_BLOCK_SPAN = 2;
const ROW_TOLERANCE = 12;
const VERTICAL_DROP_ZONE_HEIGHT = 120;

const clampBlockSpan = (value: number): DashboardBlockSpan => {
  return Math.max(MIN_BLOCK_SPAN, Math.min(GRID_COLUMNS, Math.round(value))) as DashboardBlockSpan;
};

const resizeLayoutBlock = (
  blocks: DashboardLayoutBlock[],
  blockId: string,
  span: DashboardBlockSpan,
) => {
  return blocks.map((block) => (block.id === blockId ? { ...block, span } : block));
};

const areLayoutsEqual = (firstLayout: DashboardLayoutBlock[], secondLayout: DashboardLayoutBlock[]) => {
  return firstLayout.every(
    (block, index) => block.id === secondLayout[index]?.id && block.span === secondLayout[index]?.span,
  );
};

const getInitialLayout = (blocks: DashboardGridBlock[]): DashboardLayoutBlock[] => {
  return blocks.map((block) => ({
    id: block.id,
    span: block.defaultSpan ?? 6,
  }));
};

const reorderBlocks = (blocks: DashboardLayoutBlock[], sourceId: string, targetId: string, insertAfter: boolean) => {
  const sourceIndex = blocks.findIndex((block) => block.id === sourceId);
  const targetIndex = blocks.findIndex((block) => block.id === targetId);

  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
    return blocks;
  }

  const nextBlocks = [...blocks];
  const [movedBlock] = nextBlocks.splice(sourceIndex, 1);
  const targetIndexAfterRemoval = nextBlocks.findIndex((block) => block.id === targetId);
  const insertIndex = insertAfter ? targetIndexAfterRemoval + 1 : targetIndexAfterRemoval;

  nextBlocks.splice(insertIndex, 0, movedBlock);

  return nextBlocks;
};

const getBlockIdFromElement = (element: Element | null) => {
  const blockElement = element?.closest<HTMLElement>("[data-dashboard-block-id]");
  return blockElement?.dataset.dashboardBlockId ?? null;
};

const DashboardGridContent = ({ blocks, onLayoutChange }: DashboardGridProps) => {
  const { activeLanguage } = useLanguage();
  const dictionary = activeLanguage.dictionary;
  const gridRef = useRef<HTMLDivElement | null>(null);
  const previousBlockRectsRef = useRef<Map<string, DOMRect>>(new Map());
  const [layoutBlocks, setLayoutBlocks] = useState<DashboardLayoutBlock[]>(() => getInitialLayout(blocks));
  const [draggingBlockId, setDraggingBlockId] = useState<string | null>(null);
  const [resizingBlockId, setResizingBlockId] = useState<string | null>(null);
  const [dropPreview, setDropPreview] = useState<DropPreview | null>(null);

  const blockById = useMemo(() => new Map(blocks.map((block) => [block.id, block])), [blocks]);

  const moveBlockByStep = (blockId: string, direction: -1 | 1) => {
    previousBlockRectsRef.current = captureBlockRects();
    const currentIndex = layoutBlocks.findIndex((block) => block.id === blockId);
    const targetIndex = currentIndex + direction;

    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= layoutBlocks.length) {
      previousBlockRectsRef.current = new Map();
      return;
    }

    const nextLayout = [...layoutBlocks];
    const [movedBlock] = nextLayout.splice(currentIndex, 1);

    nextLayout.splice(targetIndex, 0, movedBlock);
    setLayoutBlocks(nextLayout);
    onLayoutChange?.(nextLayout);
  };

  const getBlockElements = () => {
    const gridElement = gridRef.current;
    if (!gridElement) return [];

    return Array.from(gridElement.querySelectorAll<HTMLElement>("[data-dashboard-block-id]"));
  };

  const captureBlockRects = () => {
    const rects = new Map<string, DOMRect>();

    for (const element of getBlockElements()) {
      const blockId = element.dataset.dashboardBlockId;
      if (!blockId) continue;

      rects.set(blockId, element.getBoundingClientRect());
    }

    return rects;
  };

  const startBlockResize = (event: React.MouseEvent<HTMLElement>, blockId: string) => {
    event.preventDefault();
    event.stopPropagation();

    const gridElement = gridRef.current;
    const blockElement = event.currentTarget.closest<HTMLElement>("[data-dashboard-block-id]");
    if (!gridElement || !blockElement) return;

    const gridRect = gridElement.getBoundingClientRect();
    const blockRect = blockElement.getBoundingClientRect();
    const initialLayout = layoutBlocks;
    let finalLayout = initialLayout;

    setResizingBlockId(blockId);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const requestedWidth = Math.max(0, moveEvent.clientX - blockRect.left);
      const spanWidth = (gridRect.width + GRID_GAP) / GRID_COLUMNS;
      const nextSpan = clampBlockSpan((requestedWidth + GRID_GAP) / spanWidth);
      const nextLayout = resizeLayoutBlock(initialLayout, blockId, nextSpan);

      if (areLayoutsEqual(finalLayout, nextLayout)) return;

      previousBlockRectsRef.current = captureBlockRects();
      finalLayout = nextLayout;
      setLayoutBlocks(nextLayout);
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      setResizingBlockId(null);
      onLayoutChange?.(finalLayout);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const resizeBlockByStep = (blockId: string, direction: -1 | 1) => {
    const currentBlock = layoutBlocks.find((block) => block.id === blockId);
    if (!currentBlock) return;

    const nextLayout = resizeLayoutBlock(
      layoutBlocks,
      blockId,
      clampBlockSpan(currentBlock.span + direction),
    );

    previousBlockRectsRef.current = captureBlockRects();
    setLayoutBlocks(nextLayout);
    onLayoutChange?.(nextLayout);
  };

  useLayoutEffect(() => {
    const previousRects = previousBlockRectsRef.current;
    if (previousRects.size === 0) return;

    for (const element of getBlockElements()) {
      const blockId = element.dataset.dashboardBlockId;
      if (!blockId) continue;

      const previousRect = previousRects.get(blockId);
      if (!previousRect) continue;

      const nextRect = element.getBoundingClientRect();
      const deltaX = previousRect.left - nextRect.left;
      const deltaY = previousRect.top - nextRect.top;
      const scaleX = previousRect.width / nextRect.width;
      const positionChanged = deltaX !== 0 || deltaY !== 0;
      const widthChanged = Math.abs(previousRect.width - nextRect.width) > 0.5;

      if (!positionChanged && !widthChanged) continue;

      element.animate(
        [
          {
            transform: `translate(${deltaX}px, ${deltaY}px) scaleX(${scaleX})`,
            transformOrigin: "top left",
          },
          {
            transform: "translate(0, 0) scaleX(1)",
            transformOrigin: "top left",
          },
        ],
        {
          duration: 340,
          easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
        },
      );
    }

    previousBlockRectsRef.current = new Map();
  }, [layoutBlocks]);

  const getRows = (): GridRow[] => {
    const rows: GridRow[] = [];
    const elements = getBlockElements().filter((element) => element.dataset.dashboardBlockId !== draggingBlockId);

    for (const element of elements) {
      const rect = element.getBoundingClientRect();
      const matchingRow = rows.find((row) => Math.abs(row.top - rect.top) <= ROW_TOLERANCE);

      if (matchingRow) {
        matchingRow.elements.push(element);
        matchingRow.top = Math.min(matchingRow.top, rect.top);
        matchingRow.bottom = Math.max(matchingRow.bottom, rect.bottom);
        matchingRow.height = matchingRow.bottom - matchingRow.top;
        continue;
      }

      rows.push({
        top: rect.top,
        bottom: rect.bottom,
        height: rect.height,
        elements: [element],
      });
    }

    return rows
      .map((row) => ({
        ...row,
        elements: row.elements.sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left),
      }))
      .sort((a, b) => a.top - b.top);
  };

  const getClosestElementInRow = (row: GridRow, clientX: number) => {
    return row.elements.reduce<HTMLElement | null>((closestElement, element) => {
      const rect = element.getBoundingClientRect();
      const clampedX = Math.max(rect.left, Math.min(clientX, rect.right));
      const distance = Math.abs(clientX - clampedX);

      if (!closestElement) return element;

      const closestRect = closestElement.getBoundingClientRect();
      const closestClampedX = Math.max(closestRect.left, Math.min(clientX, closestRect.right));
      const closestDistance = Math.abs(clientX - closestClampedX);

      return distance < closestDistance ? element : closestElement;
    }, null);
  };

  const getRowDropPreview = (row: GridRow, intent: "before" | "after"): DropPreview | null => {
    const gridElement = gridRef.current;
    if (!gridElement || !draggingBlockId) return null;

    const targetElement = intent === "before" ? row.elements[0] : row.elements[row.elements.length - 1];
    const targetId = getBlockIdFromElement(targetElement);

    if (!targetId) return null;

    const gridRect = gridElement.getBoundingClientRect();
    return {
      targetId,
      intent,
      style: {
        left: 0,
        top: intent === "after" ? row.bottom - gridRect.top + GRID_GAP : row.top - gridRect.top,
        width: gridRect.width,
        height: row.height,
      },
    };
  };

  const getSideDropPreview = (row: GridRow, clientX: number): DropPreview | null => {
    const gridElement = gridRef.current;
    if (!gridElement || !draggingBlockId) return null;

    const targetElement = getClosestElementInRow(row, clientX);
    const targetId = getBlockIdFromElement(targetElement);
    const draggingBlock = layoutBlocks.find((block) => block.id === draggingBlockId);

    if (!targetElement || !targetId || !draggingBlock) return null;

    const gridRect = gridElement.getBoundingClientRect();
    const targetRect = targetElement.getBoundingClientRect();
    const columnWidth = (gridRect.width - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;
    const previewWidth = columnWidth * draggingBlock.span + GRID_GAP * (draggingBlock.span - 1);
    const intent: DropIntent = clientX < targetRect.left + targetRect.width / 2 ? "side-before" : "side-after";
    const requestedLeft = intent === "side-before"
      ? targetRect.left - gridRect.left
      : targetRect.right - gridRect.left + GRID_GAP;

    return {
      targetId,
      intent,
      style: {
        left: Math.max(0, Math.min(gridRect.width - previewWidth, requestedLeft)),
        top: row.top - gridRect.top,
        width: previewWidth,
        height: row.height,
      },
    };
  };

  const createPreview = (event: React.DragEvent): DropPreview | null => {
    const rows = getRows();
    const gridElement = gridRef.current;

    if (!gridElement || !draggingBlockId || rows.length === 0) {
      return null;
    }

    const isMobile = window.matchMedia("(max-width: 700px)").matches;
    const firstRow = rows[0];
    const lastRow = rows[rows.length - 1];

    if (event.clientY < firstRow.top) {
      return getRowDropPreview(firstRow, "before");
    }

    if (event.clientY > lastRow.bottom) {
      return getRowDropPreview(lastRow, "after");
    }

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      const nextRow = rows[index + 1];
      const isInsideRow = event.clientY >= row.top && event.clientY <= row.bottom;
      const isBetweenRows = nextRow && event.clientY > row.bottom && event.clientY < nextRow.top;

      if (isBetweenRows) {
        return getRowDropPreview(row, "after");
      }

      if (!isInsideRow) continue;

      if (isMobile) {
        return event.clientY < row.top + row.height / 2 ? getRowDropPreview(row, "before") : getRowDropPreview(row, "after");
      }

      const verticalDropZoneHeight = Math.min(VERTICAL_DROP_ZONE_HEIGHT, row.height * 0.34);

      if (event.clientY <= row.top + verticalDropZoneHeight) {
        return getRowDropPreview(row, "before");
      }

      if (event.clientY >= row.bottom - verticalDropZoneHeight) {
        return getRowDropPreview(row, "after");
      }

      return getSideDropPreview(row, event.clientX);
    }

    return event.clientY < firstRow.top ? getRowDropPreview(firstRow, "before") : getRowDropPreview(lastRow, "after");
  };

  const handleDragOver = (event: React.DragEvent) => {
    if (!draggingBlockId) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDropPreview(createPreview(event));
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();

    if (!draggingBlockId || !dropPreview) {
      setDropPreview(null);
      return;
    }

    const insertAfter = dropPreview.intent === "after" || dropPreview.intent === "side-after";
    const nextLayout = reorderBlocks(layoutBlocks, draggingBlockId, dropPreview.targetId, insertAfter);

    setLayoutBlocks(nextLayout);
    onLayoutChange?.(nextLayout);

    setDraggingBlockId(null);
    setDropPreview(null);
  };

  const handleDragEnd = () => {
    setDraggingBlockId(null);
    setDropPreview(null);
  };

  return (
    <section id="dashboard-grid-container">
      <div id="dashboard-grid-content">
        <div
          id="dashboard-grid"
          ref={gridRef}
          className={`${draggingBlockId ? "bf-dashboard-grid--dragging" : ""} ${resizingBlockId ? "bf-dashboard-grid--resizing" : ""}`}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {dropPreview ? <div className="bf-dashboard-grid__drop-preview" style={dropPreview.style} /> : null}

          {layoutBlocks.map((layoutBlock) => {
            const block = blockById.get(layoutBlock.id);
            if (!block) return null;
            const isBareBlock = Boolean(block.bare);

            const blockIndex = layoutBlocks.findIndex((item) => item.id === block.id);
            const isFirstBlock = blockIndex === 0;
            const isLastBlock = blockIndex === layoutBlocks.length - 1;

            return (
              <div
                key={block.id}
                data-dashboard-block-id={block.id}
                data-dashboard-span={layoutBlock.span}
                className={`bf-dashboard-grid__block ${
                  isBareBlock ? "bf-dashboard-grid__block--bare" : ""
                } ${resizingBlockId === block.id ? "bf-dashboard-grid__block--resizing" : ""}`}
                style={{ "--bf-dashboard-span": layoutBlock.span } as CSSProperties}
              >
                <div className="bf-dashboard-grid__mobile-order-controls" aria-label={`${block.title} ${dictionary.grid.orderControls}`}>
                  <button
                    type="button"
                    className="bf-dashboard-grid__mobile-order-button"
                    onClick={() => moveBlockByStep(block.id, -1)}
                    disabled={isFirstBlock}
                    aria-label={`${dictionary.grid.moveUp}: ${block.title}`}
                  >
                    <KeyboardArrowUpRoundedIcon fontSize="small" />
                  </button>

                  <button
                    type="button"
                    className="bf-dashboard-grid__mobile-order-button"
                    onClick={() => moveBlockByStep(block.id, 1)}
                    disabled={isLastBlock}
                    aria-label={`${dictionary.grid.moveDown}: ${block.title}`}
                  >
                    <KeyboardArrowDownRoundedIcon fontSize="small" />
                  </button>
                </div>

                {isBareBlock ? (
                  block.content
                ) : (
                  <DragDropContainer
                    id={block.id}
                    scope="dashboard-grid"
                    title={block.title}
                    className={draggingBlockId === block.id ? "bf-dashboard-grid__dragging-source" : undefined}
                    style={block.surfaceStyle}
                    onDragStartBlock={setDraggingBlockId}
                    onDragEndBlock={handleDragEnd}
                  >
                    {block.content}
                  </DragDropContainer>
                )}

                {block.resizable && !isBareBlock ? (
                  <span
                    className="bf-dashboard-grid__resize-handle"
                    role="separator"
                    tabIndex={0}
                    aria-orientation="vertical"
                    aria-label={`${dictionary.grid.resize}: ${block.title}`}
                    title={dictionary.grid.resize}
                    onMouseDown={(event) => startBlockResize(event, block.id)}
                    onKeyDown={(event) => {
                      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
                      event.preventDefault();
                      resizeBlockByStep(block.id, event.key === "ArrowLeft" ? -1 : 1);
                    }}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

const DashboardGrid = (props: DashboardGridProps) => {
  const layoutKey = props.blocks
    .map((block) => `${block.id}:${block.defaultSpan ?? 6}`)
    .join("|");

  return <DashboardGridContent key={layoutKey} {...props} />;
};

export default DashboardGrid;
