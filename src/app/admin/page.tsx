import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth";
import { AdminEditor } from "@/components/admin/admin-editor";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/admin/login");
  }

  return <AdminEditor adminEmail={admin} />;
}
