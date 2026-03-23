"use client";

import ReferralDetailClient from "./ReferralDetailClient";
import withPrivateAuth from "@/components/withPrivateAuth";

function ReferralDetailPage() {
  return <ReferralDetailClient />;
}

export default withPrivateAuth(ReferralDetailPage);
