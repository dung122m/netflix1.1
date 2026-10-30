import { redirect } from "next/navigation";

export default function CollectionIndexPage() {
  redirect("/my-list?tab=collections");
}
