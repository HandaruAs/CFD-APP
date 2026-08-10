import { CheckCircle2, Clock, XCircle } from "lucide-react";

export type VerificationStatus = "approved" | "pending" | "rejected";

const STYLES: Record<
  VerificationStatus,
  { label: string; bg: string; text: string; icon: typeof CheckCircle2 }
> = {
  approved: {
    label: "Terverifikasi",
    bg: "bg-secondary-container/40",
    text: "text-on-secondary-container",
    icon: CheckCircle2,
  },
  pending: {
    label: "Menunggu Verifikasi",
    bg: "bg-tertiary-container/15",
    text: "text-on-tertiary-container",
    icon: Clock,
  },
  rejected: {
    label: "Ditolak",
    bg: "bg-error-container/60",
    text: "text-on-error-container",
    icon: XCircle,
  },
};

export function StatusBadge({ status }: { status: VerificationStatus }) {
  const s = STYLES[status];
  const Icon = s.icon;
  return (
    <span
      className={`inline-flex items-center gap-xs rounded-full px-sm py-1 text-label-sm ${s.bg} ${s.text}`}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={2.5} />
      {s.label}
    </span>
  );
}
