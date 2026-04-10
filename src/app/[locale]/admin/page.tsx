import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";

export default async function AdminPage() {
  const locale = await getLocale();
  redirect(`/${locale}/admin/users`);
}
