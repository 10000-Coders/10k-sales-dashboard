import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import WatiStatusBadge from "@/components/wati/WatiStatusBadge";
import { formatWatiDate } from "@/lib/watiFormatters";

export default function CampaignDetailHeader({ campaign }) {
  return (
    <div className="space-y-3">
      <Link
        href="/wati/campaigns"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        WATI campaigns
      </Link>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{campaign?.name || campaign?.id || "Campaign"}</h1>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <WatiStatusBadge status={campaign?.raw_status || "—"} />
          <span>· Created {formatWatiDate(campaign?.created_at)}</span>
          <span>
            · id <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{campaign?.id}</code>
          </span>
        </p>
      </div>
    </div>
  );
}
