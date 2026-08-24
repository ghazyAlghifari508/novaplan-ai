import { PAYWALL_COPY } from "@/lib/constants";
import { Link } from "@tanstack/react-router";
export function PaywallCard({ type }: { type: "ac" | "task" }) {
	const copy = PAYWALL_COPY[type];
	return (
		<div className="rounded-xl border border-amber/20 bg-amber/5 p-6 text-center">
			<h3 className="font-[510] text-snow">{copy.title}</h3>
			<p className="mt-1 text-sm text-fog">{copy.desc}</p>
			<Link to="/pricing" className="btn-primary mt-4 inline-block rounded-md px-5 py-2">
				{copy.cta} — Rp 49.000
			</Link>
		</div>
	);
}
