// /learn is the student area's front door — it lives on the dashboard page.
import { redirect } from "next/navigation";

export default function LearnIndex() {
  redirect("/dashboard");
}
