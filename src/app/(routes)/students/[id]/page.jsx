import StudentDetailClient from "./StudentDetailClient";

export const runtime = 'edge';

/** Used for static export (e.g. Cloudflare Pages): one path is built; rewrites serve it for all /students/:id */
export async function generateStaticParams() {
  return [{ id: "0" }];
}

export const dynamicParams = true;

export default function StudentDetailPage() {
  return <StudentDetailClient />;
}
