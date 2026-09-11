import { notFound } from "next/navigation";
import Practice from "./practice";

export default function PracticePage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <Practice />;
}
