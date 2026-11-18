"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import withPrivateAuth from "@/components/withPrivateAuth";

/** Old detail URLs redirect into the single-page workspace with campaign preselected. */
function CampaignDetailClient() {
  const params = useParams();
  const router = useRouter();
  const broadcastId = params?.id ? decodeURIComponent(String(params.id)) : "";

  useEffect(() => {
    if (!broadcastId) {
      router.replace("/wati/campaigns");
      return;
    }
    router.replace(`/wati/campaigns?campaign=${encodeURIComponent(broadcastId)}`);
  }, [broadcastId, router]);

  return (
    <div className="flex flex-1 items-center justify-center p-8 text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  );
}

export default withPrivateAuth(CampaignDetailClient);
