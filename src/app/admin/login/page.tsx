import { Suspense } from "react";

import { AdminLoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<p className="p-8 text-center text-muted-foreground">Laden…</p>}>
      <AdminLoginForm />
    </Suspense>
  );
}
