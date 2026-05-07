import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { View } from "react-native";

import { Toast } from "@/components/toast";

type ToastType = "success" | "info" | "error";

type ToastState = {
  visible: boolean;
  message: string;
  type: ToastType;
  duration: number;
};

type ToastContextValue = {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    message: "",
    type: "success",
    duration: 1600,
  });

  const showToast = useCallback(
    (message: string, type: ToastType = "success", duration = 1600) => {
      setToast({ visible: true, message, type, duration });
    },
    [],
  );

  const contextValue = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={contextValue}>
      <View style={{ flex: 1 }}>
        {children}
        <Toast
          visible={toast.visible}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onHide={() => setToast((prev) => ({ ...prev, visible: false }))}
        />
      </View>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
