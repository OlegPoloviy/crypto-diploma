import { Badge } from "@/components/ui/badge";

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
  return (
    <Badge variant={statusVariant[status]} className="capitalize">
      {status}
    </Badge>
  );
}
