import { checkForUpdates, UpdateStatus } from "@/services/app-updates";
import { useCallback, useEffect, useState } from "react";

type UpdateState = UpdateStatus & {
  checking: boolean;
  lastCheckedAt: number | null;
};

const initialState: UpdateState = {
  checking: false,
  lastCheckedAt: null,
  otaAvailable: false,
};

export const useAppUpdates = (options?: { autoCheck?: boolean }) => {
  const [state, setState] = useState<UpdateState>(initialState);

  const checkNow = useCallback(async () => {
    setState((prev) => ({ ...prev, checking: true }));

    const result = await checkForUpdates();

    setState({
      ...result,
      checking: false,
      lastCheckedAt: Date.now(),
    });

    return result;
  }, []);

  useEffect(() => {
    if (options?.autoCheck) {
      void checkNow();
    }
  }, [options?.autoCheck, checkNow]);

  return {
    ...state,
    checkNow,
  };
};