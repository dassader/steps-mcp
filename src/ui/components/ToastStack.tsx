export interface ToastState {
  id: string;
  kind: "error" | "success";
  message: string;
}

interface ToastStackProps {
  toasts: ToastState[];
}

export function ToastStack({ toasts }: ToastStackProps) {
  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="toast-stack" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <div className={`toast toast-${toast.kind}`} key={toast.id} role="status">
          {toast.message}
        </div>
      ))}
    </div>
  );
}

