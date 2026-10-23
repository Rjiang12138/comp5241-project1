import Insights from "@/components/ported/Insights";
import { getSession } from "@/lib/auth";

export const metadata = { title: "Insights — Praxis" };

export default async function InsightsPage() {
  const session = await getSession();
  return <Insights session={session} />;
}
