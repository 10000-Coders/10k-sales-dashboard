import ReferralDetailClient from "./ReferralDetailClient";

/** Required for Cloudflare Pages (@cloudflare/next-on-pages) */
export const runtime = "edge";

export default function ReferralDetailPage() {
  return <ReferralDetailClient />;
}
