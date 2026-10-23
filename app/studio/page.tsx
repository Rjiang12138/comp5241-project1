import Studio from "@/components/ported/Studio";
import { getSession } from "@/lib/auth";

export const metadata = { title: "Studio — Praxis" };

export default async function StudioPage() {
  const session = await getSession();
  return <Studio session={session} />;
}
