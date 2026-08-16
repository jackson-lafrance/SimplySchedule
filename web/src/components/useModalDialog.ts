import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function focusableElements(dialog: HTMLElement) {
  return Array.from(
    dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter((element) => element.getClientRects().length > 0);
}

/**
 * Applies the browser behavior expected from the app's modal sheets: focus is
 * contained, Escape follows the safe dismiss path, background content is
 * inert, body scrolling is locked, and focus returns to the opening control.
 */
export function useModalDialog(onDismiss: () => void) {
  const dialogRef = useRef<HTMLElement | null>(null);
  const dismissRef = useRef(onDismiss);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    dismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    if (
      previousFocusRef.current === null &&
      document.activeElement instanceof HTMLElement &&
      document.activeElement !== document.body
    ) {
      previousFocusRef.current = document.activeElement;
    }
    const overlay = dialog.parentElement;
    const backgroundSiblings = overlay?.parentElement
      ? Array.from(overlay.parentElement.children).filter(
          (element): element is HTMLElement =>
            element instanceof HTMLElement && element !== overlay,
        )
      : [];
    const siblingState = backgroundSiblings.map((element) => ({
      element,
      ariaHidden: element.getAttribute("aria-hidden"),
      inert: element.inert,
    }));
    const priorBodyOverflow = document.body.style.overflow;

    backgroundSiblings.forEach((element) => {
      element.inert = true;
      element.setAttribute("aria-hidden", "true");
    });
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => {
      const initialFocus =
        dialog.querySelector<HTMLElement>("[data-initial-focus]") ??
        focusableElements(dialog)[0] ??
        dialog;
      initialFocus.focus();
    }, 0);

    const onKeyDown = (event: KeyboardEvent) => {
      const openDialogs = Array.from(
        document.querySelectorAll<HTMLElement>(
          "[role='dialog'][aria-modal='true']",
        ),
      );
      if (openDialogs.at(-1) !== dialog) {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        dismissRef.current();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusable = focusableElements(dialog);
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = priorBodyOverflow;
      siblingState.forEach(({ element, ariaHidden, inert }) => {
        element.inert = inert;
        if (ariaHidden === null) {
          element.removeAttribute("aria-hidden");
        } else {
          element.setAttribute("aria-hidden", ariaHidden);
        }
      });
      window.setTimeout(() => {
        if (previousFocusRef.current?.isConnected) {
          previousFocusRef.current.focus();
        }
      }, 0);
    };
  }, []);

  return dialogRef;
}
