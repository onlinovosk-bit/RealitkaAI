export type Toast = {
  id: number;
  message: string;
  type: "success" | "error";
};

let listeners: (() => void)[] = [];
let toasts: Toast[] = [];

export const toastStore = {
  get: () => toasts,

  subscribe: (listener: () => void) => {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  },

  push: (toast: Omit<Toast, "id">) => {
    const newToast = {
      ...toast,
      id: Date.now(),
    };

    toasts = [...toasts, newToast];
    listeners.forEach((l) => l());

    // auto remove po 3s
    setTimeout(() => {
      toasts = toasts.filter((t) => t.id !== newToast.id);
      listeners.forEach((l) => l());
    }, 3000);
  },
};
