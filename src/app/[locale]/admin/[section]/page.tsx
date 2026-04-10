import { notFound } from "next/navigation";
import AdminSectionClient from "./AdminSectionClient";

const validSections = [
  "users",
  "add-items",
  "product-catalog",
  "services-inventory",
  "orders",
  "marketing",
  "discount-codes",
  "colors",
  "tracking",
  "settings",
];

export function generateStaticParams() {
  return validSections.map((section) => ({ section }));
}

export default async function AdminSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;

  if (!validSections.includes(section)) {
    notFound();
  }

  return <AdminSectionClient section={section} />;
}
