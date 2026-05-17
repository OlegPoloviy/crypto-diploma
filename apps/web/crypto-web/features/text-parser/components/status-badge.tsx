import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";

import { ParsedTextStatus } from "../types/parsed-text";

const statusVariant: Record<
  ParsedTextStatus,
  "outline" | "success" | "warning" | "destructive" | "teal"
> = {
  queued: "outline",
  processing: "warning",
  completed: "success",
  failed: "destructive",
};

export function StatusBadge({ status }: { status: ParsedTextStatus }) {
  const { t } = useTranslation();

  return (
    <Badge variant={statusVariant[status]} className="capitalize">
      {t(status)}
    </Badge>
  );
}
