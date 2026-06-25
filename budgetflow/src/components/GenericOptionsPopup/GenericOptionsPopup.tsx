import "./GenericOptionsPopup.styles.less";

import { useLayoutEffect, useRef, useState } from "react";

export type GenericOptionsPopupOption = {
  id: string;
  label: string;
  description?: string;
  disabled?: boolean;
};

export type GenericOptionsPopupProps = {
  open: boolean;
  anchorEl: HTMLElement | null;
  title?: string;
  options: GenericOptionsPopupOption[];
  onSelect: (option: GenericOptionsPopupOption) => void;
  onClose: () => void;
};

type PopupPosition = {
  top: number;
  left: number;
};

const POPUP_WIDTH = 260;
const POPUP_MARGIN = 10;

const GenericOptionsPopup = ({ open, anchorEl, title, options, onSelect, onClose }: GenericOptionsPopupProps) => {
  const popupRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<PopupPosition>({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (!open || !anchorEl) return;

    const anchorRect = anchorEl.getBoundingClientRect();
    const popupHeight = popupRef.current?.offsetHeight ?? 0;

    const preferredTop = anchorRect.bottom + POPUP_MARGIN;
    const preferredLeft = anchorRect.right - POPUP_WIDTH;

    const maxLeft = window.innerWidth - POPUP_WIDTH - POPUP_MARGIN;
    const nextLeft = Math.max(POPUP_MARGIN, Math.min(preferredLeft, maxLeft));

    const maxTop = window.innerHeight - popupHeight - POPUP_MARGIN;
    const nextTop = Math.max(POPUP_MARGIN, Math.min(preferredTop, maxTop));

    setPosition({
      top: nextTop,
      left: nextLeft,
    });
  }, [open, anchorEl]);

  if (!open || !anchorEl) return null;

  const handleBackdropMouseDown = () => {
    onClose();
  };

  return (
    <div className="bf-generic-options-popup-layer" role="presentation" onMouseDown={handleBackdropMouseDown}>
      <div
        ref={popupRef}
        className="bf-generic-options-popup"
        style={{
          top: position.top,
          left: position.left,
          width: POPUP_WIDTH,
        }}
        role="dialog"
        aria-modal="false"
        onMouseDown={(event) => event.stopPropagation()}
      >
        {title ? <h3 className="bf-generic-options-popup__title">{title}</h3> : null}

        <div className="bf-generic-options-popup__options">
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              className="bf-generic-options-popup__option"
              disabled={option.disabled}
              onClick={() => {
                if (option.disabled) return;
                onSelect(option);
              }}
            >
              <span className="bf-generic-options-popup__option-label">{option.label}</span>
              {option.description ? <span className="bf-generic-options-popup__option-description">{option.description}</span> : null}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GenericOptionsPopup;