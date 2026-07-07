import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getToken } from "@/lib/session";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const token = getToken();
    if (!token) throw redirect({ to: "/login", search: { redirect: location.pathname } });
    return {};
  },
  component: () => <Outlet />,
});
