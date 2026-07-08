import { type KeyboardEvent as ReactKeyboardEvent, type MouseEvent, type ReactNode, useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

interface ModalProps {
  children: ReactNode;
  onClose: () => void;
  restoreFocusTo?: HTMLElement | null;
  surface?: "default" | "activity";
  size?: "default" | "editor" | "wide";
  title: string;
}

export function Modal({ children, onClose, restoreFocusTo, size = "default", surface = "default", title }: ModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElement = useRef<Element | null>(null);
  const sizeClass = size === "wide" ? "modal-panel-wide" : size === "editor" ? "modal-panel-editor" : "";
  const surfaceClass = surface === "activity" ? "modal-panel-activity" : "";

  useEffect(() => {
    previouslyFocusedElement.current = document.activeElement;
    window.setTimeout(() => {
      const preferredElement = panelRef.current?.querySelector<HTMLElement>("[autofocus]");
      (preferredElement ?? getPrimaryFocusableElement(panelRef.current) ?? getFocusableElements(panelRef.current)[0])?.focus();
    }, 0);

    function handleKeyDown(event: KeyboardEvent): void {
      if (!isTopmostDialog(panelRef.current)) {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      const elementToRestore = restoreFocusTo ?? previouslyFocusedElement.current;
      window.setTimeout(() => {
        if (elementToRestore instanceof HTMLElement && document.contains(elementToRestore)) {
          elementToRestore.focus();
        }
      }, 0);
    };
  }, [onClose, restoreFocusTo]);

  function handlePanelKeyDown(event: ReactKeyboardEvent<HTMLDivElement>): void {
    if (event.key !== "Tab") {
      return;
    }

    const focusableElements = getFocusableElements(panelRef.current);
    if (focusableElements.length === 0) {
      event.preventDefault();
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
      return;
    }

    if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  function handleBackdropMouseDown(event: MouseEvent<HTMLDivElement>): void {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={handleBackdropMouseDown} role="presentation">
      <div
        aria-labelledby={titleId}
        aria-modal="true"
        className={`modal-panel ${sizeClass} ${surfaceClass}`}
        onKeyDown={handlePanelKeyDown}
        ref={panelRef}
        role="dialog"
      >
        <div className="modal-header">
          <div className="modal-title" id={titleId}>
            {title}
          </div>
          <button aria-label="Close" className="icon-button" onClick={onClose} type="button">
            <X aria-hidden="true" size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

function getFocusableElements(root: HTMLElement | null): HTMLElement[] {
  if (!root) {
    return [];
  }

  return Array.from(
    root.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ).filter((element) => !element.hasAttribute("disabled") && element.offsetParent !== null);
}

function getPrimaryFocusableElement(root: HTMLElement | null): HTMLElement | null {
  return (
    root?.querySelector<HTMLElement>(
      ".modal-body input:not([disabled]), .modal-body textarea:not([disabled]), .modal-body select:not([disabled]), .modal-body button:not([disabled]), .modal-body a[href]"
    ) ?? null
  );
}

function isTopmostDialog(panel: HTMLElement | null): boolean {
  if (!panel) {
    return false;
  }

  const dialogs = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]'));
  return dialogs.at(-1) === panel;
}
