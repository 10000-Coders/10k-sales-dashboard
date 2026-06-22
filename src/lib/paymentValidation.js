/** Proof screenshot is optional for cash; required for UPI, bank, and card. */
export function isProofScreenshotRequired(paymentMode) {
  return paymentMode !== "cash";
}

/** UPI payments must include a transaction / reference ID. */
export function isTransactionIdRequired(paymentMode) {
  return paymentMode === "upi";
}

/** UPI mode → receivers with upi_id; bank/card → receivers with account number. */
export function paymentReceiversForMode(receivers, paymentMode) {
  if (!Array.isArray(receivers)) return [];
  if (paymentMode === "upi") {
    return receivers.filter((r) => (r.upi_id || "").trim());
  }
  // if (paymentMode === "bank" || paymentMode === "card") {
  //   return receivers.filter((r) => (r.account || "").trim());
  // }
  return receivers;
}
