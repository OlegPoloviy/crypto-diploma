import { Badge } from "@/components/ui/badge";

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
  return (
    <Badge variant={statusVariant[status]} className="capitalize">
      {status}
    </Badge>
  );
}
