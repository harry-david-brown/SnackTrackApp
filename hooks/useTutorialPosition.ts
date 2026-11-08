import { useEffect, useState, useCallback, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useUser } from "@contexts/UserContext";
import { useImportPreferences } from "@hooks/useImportPreferences";
import type { ExportProvider } from "@features/import-flow/contracts";
import { tutorialPositionKey } from "@utils/importJourneyStorage";

export function useTutorialPosition(
  provider: ExportProvider,
  mode: "request" | "download",
  count: number,
) {
  const { state } = useUser();
  const { preferences } = useImportPreferences();
  const p =
    provider === "uber_eats"
      ? preferences?.export.providers.uberEats
      : preferences?.export.providers.doorDash;
  const key = state.user?.id
    ? tutorialPositionKey(
        state.user.id,
        provider,
        mode,
        p?.requestId ?? p?.requestedAt ?? "new",
      )
    : null;
  const [position, setPosition] = useState({
    key: null as string | null,
    index: 0,
  });
  const revision = useRef(0);
  useEffect(() => {
    let live = true;
    const initialRevision = revision.current;
    if (key)
      void AsyncStorage.getItem(key)
        .then((value) => {
          if (live && revision.current === initialRevision)
            setPosition({
              key,
              index: Math.max(
                0,
                Math.min(Math.floor(Number(value) || 0), count - 1),
              ),
            });
        })
        .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [key, count]);
  const setIndex = useCallback(
    (index: number) => {
      revision.current += 1;
      const next = Math.max(0, Math.min(index, count - 1));
      setPosition({ key, index: next });
      if (key)
        void AsyncStorage.setItem(key, String(next)).catch(() => undefined);
    },
    [key, count],
  );
  return [position.key === key ? position.index : 0, setIndex] as const;
}
