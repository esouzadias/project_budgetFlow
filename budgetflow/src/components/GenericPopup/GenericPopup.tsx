import "./GenericPopup.styles.less";

import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import type { ReactNode } from "react";
import { useLanguage } from "../../localization/useLanguage";

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
  confirmLabel,
  cancelLabel,
  variant = "default",
  showCloseButton = true,
  closeOnBackdropClick = true,
  width = "min(440px, 100%)",
  onConfirm,
  onCancel,
  children,
}: GenericPopupProps) => {
  const { activeLanguage } = useLanguage();
  const dictionary = activeLanguage.dictionary;
  if (!open) return null;

  const handleBackdropMouseDown = () => {
    if (!closeOnBackdropClick) return;
    onCancel?.();
  };

  return (
    <div className="bf-generic-popup" role="presentation" onMouseDown={handleBackdropMouseDown}>
      <section
        className={`bf-generic-popup__panel bf-generic-popup__panel--${variant}`}
        style={{ width }}
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
            <button type="button" className="bf-generic-popup__close-button" onClick={onCancel} aria-label={dictionary.genericPopup.close}>
              <CloseRoundedIcon fontSize="small" />
            </button>
          ) : null}
        </header>

        {children ? <div className="bf-generic-popup__body">{children}</div> : null}

        <footer className="bf-generic-popup__actions">
          {onCancel ? (
            <button type="button" className="bf-generic-popup__button bf-generic-popup__button--cancel" onClick={onCancel}>
              {cancelLabel ?? dictionary.common.cancel}
            </button>
          ) : null}

          {onConfirm ? (
            <button
              type="button"
              className={`bf-generic-popup__button bf-generic-popup__button--confirm bf-generic-popup__button--${variant}`}
              onClick={onConfirm}
            >
              {confirmLabel ?? dictionary.common.confirm}
            </button>
          ) : null}
        </footer>
      </section>
    </div>
  );
};

export default GenericPopup;
