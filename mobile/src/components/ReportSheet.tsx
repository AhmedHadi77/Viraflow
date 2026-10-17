import { useSyncExternalStore } from "react";
import { Alert } from "react-native";
import { getCopy } from "../data/copy";
import { useAppState } from "../providers/AppProvider";
import { ReportedEntityType } from "../types/models";
import { SelectionSheet } from "./SelectionSheet";

interface ReportTarget {
  entityType: ReportedEntityType;
  entityId: string;
  ownerId?: string;
}

let target: ReportTarget | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

/** Opens the "why are you reporting this?" sheet from anywhere in the app. */
export function openReportSheet(next: ReportTarget) {
  target = next;
  emit();
}

function closeReportSheet() {
  target = null;
  emit();
}

const REASONS = ["reportSpam", "reportNudity", "reportHarassment", "reportViolence", "reportScam", "reportOther"] as const;

/** Mounted once next to the navigator. */
export function ReportSheetHost() {
  const { language, submitReport } = useAppState();
  const copy = getCopy(language);
  const current = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => target,
    () => target
  );

  return (
    <SelectionSheet
      onClose={closeReportSheet}
      onSelect={(reasonKey) => {
        const reported = current;
        closeReportSheet();
        if (!reported) {
          return;
        }
        const reason = copy[reasonKey as (typeof REASONS)[number]] ?? reasonKey;
        void submitReport({ ...reported, reason }).then((result) => {
          Alert.alert(result.ok ? copy.reportAction : copy.callUnavailable, result.ok ? copy.reportThanks : result.message);
        });
      }}
      options={REASONS.map((key) => ({ value: key, title: copy[key] }))}
      selectedValue={null}
      title={copy.reportTitle}
      visible={Boolean(current)}
    />
  );
}
