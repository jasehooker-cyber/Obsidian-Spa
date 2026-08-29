import { redirect } from "next/navigation";

/**
 * `/admin` is the address worth remembering, so it lands on the client list
 * rather than 404ing. When there is a second admin screen this becomes a menu.
 */
export default function AdminPage() {
  redirect("/admin/clients");
}
