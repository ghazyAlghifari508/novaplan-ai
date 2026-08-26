import { createFileRoute } from "@tanstack/react-router";
import { Faq } from "@/components/faq/faq";

export const Route = createFileRoute("/faq")({
  component: Faq,
});
