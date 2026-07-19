import { AdminLoginForm } from "@/components/admin-login-form";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_SESSION_COOKIE, isAdminSessionValue } from "@/lib/admin-auth";

export default async function AdminLoginPage() {
  const cookieStore = await cookies();

  if (isAdminSessionValue(cookieStore.get(ADMIN_SESSION_COOKIE)?.value)) {
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
