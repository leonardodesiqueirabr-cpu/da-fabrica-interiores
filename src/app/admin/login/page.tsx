import { AdminLoginForm } from "@/components/admin-login-form";
import { redirect } from "next/navigation";
import { hasAdminSession } from "@/lib/admin-session";

export default async function AdminLoginPage() {
  if (await hasAdminSession()) {
    redirect("/admin");
  }

  return (
    <section className="container-shell grid min-h-[70vh] place-items-center py-10">
      <div className="w-full max-w-md">
        <AdminLoginForm />
      </div>
    </section>
  );
}
