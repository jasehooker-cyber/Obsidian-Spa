import type { Metadata } from "next";
import ClientDirectory from "@/components/admin/ClientDirectory";

export const metadata: Metadata = {
  title: "Clients",
  robots: { index: false, follow: false },
};

export default function AdminClientsPage() {
  return (
    <div className="mx-auto max-w-7xl px-6">
      <ClientDirectory />
    </div>
  );
}
