import { redirect } from "next/navigation";
import { isAdmin, currentMemberId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  if (await isAdmin()) redirect("/admin");
  if (await currentMemberId()) redirect("/book");
  redirect("/login");
}
