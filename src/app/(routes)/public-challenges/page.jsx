"use client";

import dynamic from "next/dynamic";
import withPrivateAuth from "@/components/withPrivateAuth";

const PublicChallengeManager = dynamic(
  () => import("@/components/publicChallengeComponents/PublicChallengeManager"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-500" />
      </div>
    ),
  }
);

function PublicChallengesPage() {
  return <PublicChallengeManager />;
}

export default withPrivateAuth(PublicChallengesPage);
