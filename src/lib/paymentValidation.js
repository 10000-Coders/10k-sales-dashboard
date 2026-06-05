/** Proof screenshot is optional for cash; required for UPI, bank, and card. */
export function isProofScreenshotRequired(paymentMode) {
  return paymentMode !== "cash";
}
