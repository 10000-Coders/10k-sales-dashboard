"use client";

import withPrivateAuth from "@/components/withPrivateAuth";
import PublicChallengeManager from "@/components/publicChallengeComponents/PublicChallengeManager";

function PublicChallengesPage() {
  return <PublicChallengeManager />;
}

export default withPrivateAuth(PublicChallengesPage);
