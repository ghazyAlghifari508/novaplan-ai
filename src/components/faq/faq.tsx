"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { FAQ_CATEGORIES } from "./faq-data";

export function Faq() {
	const [openItems, setOpenItems] = useState<Record<string, boolean>>({});

	const toggleItem = (key: string) => {
		setOpenItems((prev) => ({
			...prev,
			[key]: !prev[key],
		}));
	};

	return (
		<main className="min-h-[calc(100vh-3.5rem)] bg-onyx px-6 py-10">
			<div className="mx-auto max-w-4xl">
				<header className="mb-8">
					<h1 className="font-inter text-2xl font-[510] text-snow">
						Frequently Asked Questions
					</h1>
					<p className="mt-1 font-inter text-sm text-fog">
						Pertanyaan yang sering diajukan seputar akun, credit, dan alur kerja
						PrdFy.
					</p>
				</header>

				<div className="space-y-8">
					{FAQ_CATEGORIES.map((cat) => (
						<section key={cat.id} className="space-y-3">
							<h2 className="font-inter text-xs font-[510] uppercase tracking-wider text-mist">
								{cat.title}
							</h2>

							<div className="divide-y divide-graphite rounded-lg border border-graphite bg-charcoal">
								{cat.items.map((item, i) => {
									const itemKey = `${cat.id}-${i}`;
									const isOpen = !!openItems[itemKey];

									return (
										<div key={itemKey}>
											<button
												type="button"
												onClick={() => toggleItem(itemKey)}
												className="flex w-full items-center justify-between gap-4 p-4 text-left font-inter text-sm font-[510] text-snow transition-colors hover:bg-white/5"
												aria-expanded={isOpen}
											>
												<span>{item.q}</span>
												<ChevronDown
													size={16}
													className={`shrink-0 text-fog transition-transform duration-200 ${
														isOpen ? "rotate-180 text-snow" : ""
													}`}
												/>
											</button>

											{isOpen && (
												<div className="border-t border-graphite/60 px-4 pb-4 pt-3 font-inter text-sm leading-relaxed text-fog">
													<p>{item.a}</p>
												</div>
											)}
										</div>
									);
								})}
							</div>
						</section>
					))}
				</div>

				<div className="mt-12 border-t border-graphite pt-6 text-center">
					<p className="font-inter text-xs text-fog">
						Punya pertanyaan lain?{" "}
						<a
							href="/settings/feedback"
							className="font-[510] text-snow hover:underline"
						>
							Hubungi kami via Feedback
						</a>
					</p>
				</div>
			</div>
		</main>
	);
}
