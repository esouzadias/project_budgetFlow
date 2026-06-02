import "./DashboardGrid.style.less";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import KeyboardArrowUpRoundedIcon from "@mui/icons-material/KeyboardArrowUpRounded";

import DragDropContainer, { type DropIntent } from "../../../components/DragDropContainer/DragDropContainer";

type DashboardBlockSize = "full" | "half" | "third";

export type DashboardGridBlock = {
  id: string;
  title: string;
  content: ReactNode;
  defaultSize?: DashboardBlockSize;
};

type DashboardLayoutBlock = {
  id: string;
  size: DashboardBlockSize;
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
  size: DashboardBlockSize;
  resizeIds: string[];
  style: CSSProperties;
};

type DashboardGridProps = {
  blocks: DashboardGridBlock[];
};

const GRID_GAP = 12;
const ROW_TOLERANCE = 12;
const VERTICAL_DROP_ZONE_HEIGHT = 120;

const sizeToSpan: Record<DashboardBlockSize, number> = {
  full: 6,
  half: 3,
  third: 2,
};

const getInitialLayout = (blocks: DashboardGridBlock[]): DashboardLayoutBlock[] => {
  return blocks.map((block) => ({
    id: block.id,
    size: block.defaultSize ?? "half",
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

const getRowBlockIds = (row: GridRow) => {
  return row.elements
    .map((element) => getBlockIdFromElement(element))
    .filter((id): id is string => Boolean(id));
};

const DashboardGrid = ({ blocks }: DashboardGridProps) => {
  const gridRef = useRef<HTMLDivElement | null>(null);
  const previousBlockRectsRef = useRef<Map<string, DOMRect>>(new Map());
  const [layoutBlocks, setLayoutBlocks] = useState<DashboardLayoutBlock[]>(() => getInitialLayout(blocks));
  const [draggingBlockId, setDraggingBlockId] = useState<string | null>(null);
  const [dropPreview, setDropPreview] = useState<DropPreview | null>(null);

  const blockById = useMemo(() => new Map(blocks.map((block) => [block.id, block])), [blocks]);

  useEffect(() => {
    setLayoutBlocks((currentLayout) => {
      const nextIds = new Set(blocks.map((block) => block.id));
      const existingLayout = currentLayout.filter((block) => nextIds.has(block.id));
      const existingIds = new Set(existingLayout.map((block) => block.id));
      const newLayout = blocks
        .filter((block) => !existingIds.has(block.id))
        .map((block) => ({ id: block.id, size: block.defaultSize ?? "half" }));

      return [...existingLayout, ...newLayout];
    });
  }, [blocks]);

  const moveBlockByStep = (blockId: string, direction: -1 | 1) => {
    previousBlockRectsRef.current = captureBlockRects();

    setLayoutBlocks((currentLayout) => {
      const currentIndex = currentLayout.findIndex((block) => block.id === blockId);
      const targetIndex = currentIndex + direction;

      if (currentIndex < 0 || targetIndex < 0 || targetIndex >= currentLayout.length) {
        previousBlockRectsRef.current = new Map();
        return currentLayout;
      }

      const nextLayout = [...currentLayout];
      const [movedBlock] = nextLayout.splice(currentIndex, 1);
      nextLayout.splice(targetIndex, 0, movedBlock);

      return nextLayout;
    });
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

      if (deltaX === 0 && deltaY === 0) continue;

      element.animate(
        [
          { transform: `translate(${deltaX}px, ${deltaY}px)` },
          { transform: "translate(0, 0)" },
        ],
        {
          duration: 260,
          easing: "ease-in-out",
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
    const rowIds = getRowBlockIds(row);

    return {
      targetId,
      intent,
      size: "full",
      resizeIds: Array.from(new Set([...rowIds, draggingBlockId])),
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
    if (!gridElement || !draggingBlockId || row.elements.length >= 3) return null;

    const targetElement = getClosestElementInRow(row, clientX);
    const targetId = getBlockIdFromElement(targetElement);
    if (!targetElement || !targetId) return null;

    const gridRect = gridElement.getBoundingClientRect();
    const targetRect = targetElement.getBoundingClientRect();
    const size: DashboardBlockSize = row.elements.length >= 2 ? "third" : "half";
    const columnWidth = size === "third" ? (gridRect.width - GRID_GAP * 2) / 3 : (gridRect.width - GRID_GAP) / 2;
    const intent: DropIntent = clientX < targetRect.left + targetRect.width / 2 ? "side-before" : "side-after";
    const targetIndex = row.elements.indexOf(targetElement);
    const previewIndex = intent === "side-before" ? targetIndex : targetIndex + 1;
    const rowIds = getRowBlockIds(row);

    return {
      targetId,
      intent,
      size,
      resizeIds: Array.from(new Set([...rowIds, draggingBlockId])),
      style: {
        left: previewIndex * (columnWidth + GRID_GAP),
        top: row.top - gridRect.top,
        width: columnWidth,
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

    setLayoutBlocks((currentLayout) => {
      const insertAfter = dropPreview.intent === "after" || dropPreview.intent === "side-after";
      const nextLayout = reorderBlocks(currentLayout, draggingBlockId, dropPreview.targetId, insertAfter);
      const resizeIds = new Set(dropPreview.resizeIds);

      return nextLayout.map((block) => (resizeIds.has(block.id) ? { ...block, size: dropPreview.size } : block));
    });

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
          className={draggingBlockId ? "bf-dashboard-grid--dragging" : ""}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {dropPreview ? <div className="bf-dashboard-grid__drop-preview" style={dropPreview.style} /> : null}

          {layoutBlocks.map((layoutBlock) => {
            const block = blockById.get(layoutBlock.id);
            if (!block) return null;

            const blockIndex = layoutBlocks.findIndex((item) => item.id === block.id);
            const isFirstBlock = blockIndex === 0;
            const isLastBlock = blockIndex === layoutBlocks.length - 1;

            return (
              <div
                key={block.id}
                data-dashboard-block-id={block.id}
                className={`bf-dashboard-grid__block bf-dashboard-grid__block--span-${sizeToSpan[layoutBlock.size]}`}
              >
                <div className="bf-dashboard-grid__mobile-order-controls" aria-label={`${block.title} order controls`}>
                  <button
                    type="button"
                    className="bf-dashboard-grid__mobile-order-button"
                    onClick={() => moveBlockByStep(block.id, -1)}
                    disabled={isFirstBlock}
                    aria-label={`Move ${block.title} up`}
                  >
                    <KeyboardArrowUpRoundedIcon fontSize="small" />
                  </button>

                  <button
                    type="button"
                    className="bf-dashboard-grid__mobile-order-button"
                    onClick={() => moveBlockByStep(block.id, 1)}
                    disabled={isLastBlock}
                    aria-label={`Move ${block.title} down`}
                  >
                    <KeyboardArrowDownRoundedIcon fontSize="small" />
                  </button>
                </div>

                <DragDropContainer
                  id={block.id}
                  scope="dashboard-grid"
                  title={block.title}
                  className={draggingBlockId === block.id ? "bf-dashboard-grid__dragging-source" : undefined}
                  onDragStartBlock={setDraggingBlockId}
                  onDragEndBlock={handleDragEnd}
                >
                  {block.content}
                </DragDropContainer>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default DashboardGrid;
