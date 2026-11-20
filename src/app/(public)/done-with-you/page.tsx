/**
 * The Rs 14,999 Done-with-you service is no longer sold (2026-11-20). Old links (emails, partner posts)
 * land on the plans instead: Pro and Done-for-you.
 */
import { redirect } from "next/navigation";

export default function DoneWithYouMoved() {
  redirect("/#pricing");
}
