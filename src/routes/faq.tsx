import { createFileRoute } from "@tanstack/react-router";
import { Faq } from "@/components/faq/faq";

export const Route = createFileRoute("/faq")({
	head: () => ({
		meta: [
			{ title: "FAQ | PrdFy" },
			{
				name: "description",
				content:
					"Pertanyaan yang sering diajukan seputar akun, credit, dan alur kerja PrdFy.",
			},
		],
	}),
	component: Faq,
});
