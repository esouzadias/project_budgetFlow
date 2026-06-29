import "./GenericPopup.styles.less";

import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import type { ReactNode } from "react";

export type GenericPopupVariant = "default" | "danger" | "success";

export type GenericPopupProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: GenericPopupVariant;
  showCloseButton?: boolean;
  closeOnBackdropClick?: boolean;
  width?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  children?: ReactNode;
};

const GenericPopup = ({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  showCloseButton = true,
  closeOnBackdropClick = true,
  width = "min(440px, 100%);",
  onConfirm,
  onCancel,
  children,
}: GenericPopupProps) => {
  if (!open) return null;

  const handleBackdropMouseDown = () => {
    if (!closeOnBackdropClick) return;
    onCancel?.();
  };

  return (
    <div className="bf-generic-popup" style={{width: width}} role="presentation" onMouseDown={handleBackdropMouseDown}>
      <section
        className={`bf-generic-popup__panel bf-generic-popup__panel--${variant}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bf-generic-popup-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="bf-generic-popup__header">
          <div className="bf-generic-popup__heading">
            <h3 id="bf-generic-popup-title">{title}</h3>
            {description ? <p>{description}</p> : null}
          </div>

          {showCloseButton ? (
            <button type="button" className="bf-generic-popup__close-button" onClick={onCancel} aria-label="Close popup">
              <CloseRoundedIcon fontSize="small" />
            </button>
          ) : null}
        </header>

        {children ? <div className="bf-generic-popup__body">{children}</div> : null}

        <footer className="bf-generic-popup__actions">
          {onCancel ? (
            <button type="button" className="bf-generic-popup__button bf-generic-popup__button--cancel" onClick={onCancel}>
              {cancelLabel}
            </button>
          ) : null}

          {onConfirm ? (
            <button
              type="button"
              className={`bf-generic-popup__button bf-generic-popup__button--confirm bf-generic-popup__button--${variant}`}
              onClick={onConfirm}
            >
              {confirmLabel}
            </button>
          ) : null}
        </footer>
      </section>
    </div>
  );
};

export default GenericPopup;