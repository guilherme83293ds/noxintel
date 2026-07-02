import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getToken } from "@/lib/session";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const token = getToken();
    if (!token) throw redirect({ to: "/login" });
    return {};
  },
  component: () => <Outlet />,
});
