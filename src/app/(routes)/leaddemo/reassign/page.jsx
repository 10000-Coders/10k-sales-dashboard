"use client";

import LeadReassignClient from "./LeadReassignClient";
import withPrivateAuth from "@/components/withPrivateAuth";

function LeadReassignPage() {
  return <LeadReassignClient />;
}

export default withPrivateAuth(LeadReassignPage);