"use client";

import { ChatInput } from "./chat-input";

export function HeroContent() {
	return (
		<div className="relative z-10 flex w-full flex-col items-center px-6 text-center animate-hero-fade-in">
			<div className="flex w-full max-w-[1200px] flex-col items-center gap-8 pt-16 md:pt-20">
				<h1 className="max-w-[860px] font-inter text-[48px] font-light leading-none text-snow md:text-[64px] lg:text-[72px] animate-hero-title">
					Dari ide produk ke PRD yang siap dieksekusi
				</h1>

				<p className="max-w-[650px] font-inter text-[17px] font-normal leading-[1.6] text-fog animate-hero-subtitle">
					Describe produk kamu secara natural dan AI akan generate Product
					Requirements Document yang lengkap, terstruktur, dan profesional.
				</p>

				<div className="w-full animate-hero-chat">
					<ChatInput />
				</div>
			</div>
		</div>
	);
}
