import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface PrdCardProps {
  id: string;
  name: string;
  status: string;
  description: string | null;
  updatedAt: string;
}

const STATUS_MAP = {
  draft: { label: "Draft", variant: "warning" as const },
  completed: { label: "Selesai", variant: "success" as const },
  archived: { label: "Diarsipkan", variant: "default" as const },
};

export function PrdCard({
  id,
  name,
  status,
  description,
  updatedAt,
}: PrdCardProps) {
  const statusInfo = STATUS_MAP[status as keyof typeof STATUS_MAP] || STATUS_MAP.draft;

  return (
    <Link
      href={`/prd/${id}`}
      className="group flex flex-col rounded-xl border border-border-subtle bg-white p-5 transition-all hover:shadow-md hover:-translate-y-0.5"
    >
      <div className="mb-3 flex items-start justify-between">
        <h3 className="font-fustat text-lg font-semibold leading-tight group-hover:text-primary-black/80">
          {name}
        </h3>
        <Badge variant={statusInfo.variant} size="sm">
          {statusInfo.label}
        </Badge>
      </div>

      {description ? (
        <p className="mb-4 line-clamp-2 text-sm text-text-gray">{description}</p>
      ) : (
        <p className="mb-4 text-sm text-text-gray/50 italic">Belum ada deskripsi</p>
      )}

      <div className="mt-auto flex items-center justify-between text-xs text-text-gray/60">
        <span>
          {new Date(updatedAt).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="opacity-0 transition-opacity group-hover:opacity-100"
        >
          <path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </Link>
  );
}