import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";

import { ClassicalCipherJobStatus } from "../types/classical-cipher";

const statusVariant: Record<
  ClassicalCipherJobStatus,
  "outline" | "success" | "warning" | "destructive" | "teal"
> = {
  queued: "outline",
  processing: "warning",
  completed: "success",
  failed: "destructive",
};

export function CipherStatusBadge({
  status,
}: {
  status: ClassicalCipherJobStatus;
}) {
  const { t } = useTranslation();

  return (
    <Badge variant={statusVariant[status]} className="capitalize">
      {t(status)}
    </Badge>
  );
}
