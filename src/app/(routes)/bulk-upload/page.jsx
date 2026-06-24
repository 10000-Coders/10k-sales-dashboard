"use client";

import BulkLeadUploadClient from "./BulkLeadUploadClient";
import withPrivateAuth from "@/components/withPrivateAuth";

function BulkLeadUploadPage() {
  return <BulkLeadUploadClient />;
}

export default withPrivateAuth(BulkLeadUploadPage);
