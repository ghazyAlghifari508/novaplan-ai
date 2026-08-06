"use client";

import { cn } from "@/lib/utils";
import type { ModelDefinition } from "@/lib/model-config";
import { findModel } from "@/lib/model-config";
import { Sparkles, Bot, Moon } from "lucide-react";
import {
	SiMeta,
	SiNvidia,
	SiXiaomi,
} from "@icons-pack/react-simple-icons";

interface ModelIconProps {
	/** Model ID or a ModelDefinition object */
	model: string | ModelDefinition;
	/** Whether the model is locked for the current user */
	isLocked?: boolean;
	/** Icon size in pixels */
	size?: number;
}

// DeepSeek brand logo (whale). Path from simpleicons.org/deepseek
const SiDeepseek = ({
	size,
	className,
}: {
	size: number;
	className?: string;
}) => (
	<svg
		role="img"
		viewBox="0 0 24 24"
		width={size}
		height={size}
		className={className}
		fill="currentColor"
		xmlns="http://www.w3.org/2000/svg"
	>
		<path d="M23.748 4.651c-.254-.124-.364.113-.512.233-.051.04-.094.09-.137.137-.372.397-.806.657-1.373.626-.829-.046-1.537.214-2.163.848-.133-.782-.575-1.248-1.247-1.548-.352-.155-.708-.311-.955-.65-.172-.24-.219-.509-.305-.774-.055-.16-.11-.323-.293-.35-.2-.031-.278.136-.356.276-.313.572-.434 1.202-.422 1.84.027 1.436.633 2.58 1.838 3.393.137.094.172.187.129.323-.082.28-.18.553-.266.833-.055.179-.137.218-.328.14a5.5 5.5 0 0 1-1.737-1.179c-.857-.828-1.631-1.743-2.597-2.46a12 12 0 0 0-.689-.47c-.985-.957.13-1.743.387-1.836.27-.098.094-.433-.778-.428-.872.003-1.67.295-2.687.685a3 3 0 0 1-.465.136 9.6 9.6 0 0 0-2.883-.101c-1.885.21-3.39 1.1-4.497 2.622C.082 8.776-.231 10.854.152 13.02c.403 2.284 1.568 4.175 3.36 5.653 1.857 1.533 3.997 2.284 6.438 2.14 1.482-.085 3.132-.284 4.994-1.86.47.234.962.328 1.78.398.629.058 1.235-.031 1.705-.129.735-.155.684-.836.418-.961-2.155-1.004-1.682-.595-2.112-.926 1.095-1.295 2.768-3.598 3.284-6.733.05-.346.115-.834.108-1.114-.004-.171.035-.238.23-.257a4.2 4.2 0 0 0 1.545-.475c1.397-.763 1.96-2.016 2.093-3.517.02-.23-.004-.467-.247-.588M11.58 18.168c-2.088-1.642-3.101-2.183-3.52-2.16-.39.024-.32.472-.234.763.09.288.207.487.371.74.114.167.192.416-.113.603-.673.416-1.842-.14-1.897-.168-1.361-.801-2.5-1.86-3.301-3.306-.775-1.393-1.225-2.888-1.299-4.482-.02-.385.094-.522.477-.592a4.7 4.7 0 0 1 1.53-.038c2.131.311 3.946 1.264 5.467 2.774.868.86 1.525 1.887 2.202 2.89.72 1.066 1.494 2.082 2.48 2.915.348.291.626.513.892.677-.802.09-2.14.109-3.055-.615zm1.001-6.44a.306.306 0 0 1 .415-.287.3.3 0 0 1 .113.074.3.3 0 0 1 .086.214c0 .17-.136.307-.308.307a.303.303 0 0 1-.306-.307m3.11 1.596c-.2.081-.4.151-.591.16a1.25 1.25 0 0 1-.798-.254c-.274-.23-.47-.358-.551-.758a1.7 1.7 0 0 1 .015-.588c.07-.327-.007-.537-.238-.727-.188-.156-.426-.199-.689-.199a.6.6 0 0 1-.254-.078.253.253 0 0 1-.114-.358 1 1 0 0 1 .192-.21c.356-.202.767-.136 1.146.016.352.144.618.408 1.001.782.392.451.462.576.685.915.176.264.336.536.446.848.066.194-.02.353-.25.45" />
	</svg>
);

// Big Pickle: stylized pickle silhouette (no official brand icon exists)
const SiBigPickle = ({
	size,
	className,
}: {
	size: number;
	className?: string;
}) => (
	<svg
		role="img"
		viewBox="0 0 24 24"
		width={size}
		height={size}
		className={className}
		fill="currentColor"
		xmlns="http://www.w3.org/2000/svg"
	>
		<path d="M12 1C8.5 1 6 3.8 6 7.2c0 1.6.4 3 .9 4.3.2.5-.1.8-.4 1.3-.6 1-1.2 2.1-1.5 3.5-.4 2 .1 3.7 1.4 4.9.8.8 2 1.3 3.3 1.3h4.6c1.3 0 2.5-.5 3.3-1.3 1.3-1.2 1.8-2.9 1.4-4.9-.3-1.4-.9-2.5-1.5-3.5-.3-.5-.6-.8-.4-1.3.5-1.3.9-2.7.9-4.3C18 3.8 15.5 1 12 1zm0 2.2c2.3 0 3.8 1.8 3.8 4 0 1.1-.3 2.1-.6 3-.1.3-.4.5-.7.4-.5-.2-1-.3-1.5-.4-.3 0-.5-.3-.5-.6V8.5c0-.3-.2-.5-.5-.5s-.5.2-.5.5v.7c0 .3-.2.5-.5.6-.5.1-1 .2-1.5.4-.3.1-.6-.1-.7-.4-.3-.9-.6-1.9-.6-3 0-2.2 1.5-4 3.8-4zm-1.8 8.6c.6-.2 1.2-.3 1.8-.3s1.2.1 1.8.3c.2.1.4.3.4.5 0 .8-.4 1.5-1 2.1-.6.6-1.5.9-2.5.6-1-.2-1.7-1.1-1.9-2.1-.1-.3.1-.5.4-.6.3-.1.7-.3 1-.5zm-.4 4.3c.7.4 1.5.6 2.2.6.8 0 1.5-.2 2.2-.6.2-.1.5 0 .6.2.1.2 0 .5-.2.6-.8.5-1.7.7-2.6.7s-1.8-.2-2.6-.7c-.2-.1-.3-.4-.2-.6.1-.2.4-.3.6-.2z" />
	</svg>
);

/**
 * Renders the appropriate brand icon for a given AI model.
 * Uses data from model-config.ts to determine which icon and color to use.
 */
export function ModelIcon({ model, isLocked, size = 12 }: ModelIconProps) {
	const def = typeof model === "string" ? findModel(model) : model;
	const className = cn(def.colorClass, isLocked && "opacity-40 grayscale");

	switch (def.brand) {
		case "meta":
			return <SiMeta size={size} className={className} />;
		case "nvidia":
			return <SiNvidia size={size} className={className} />;
		case "xiaomi":
			return <SiXiaomi size={size} className={className} />;
		case "deepseek":
			return <SiDeepseek size={size} className={className} />;
		case "bigpickle":
			return <SiBigPickle size={size} className={className} />;
		case "ling":
			// InclusionAI (Ant Group) org logo: no public SVG, use raster avatar
			return (
				<img
					src="/icons/inclusionai.png"
					alt="InclusionAI"
					width={size}
					height={size}
					className={cn("object-contain", isLocked && "opacity-40 grayscale")}
				/>
			);
		case "kimi":
			return <Moon size={size} className={className} />;
		case "bot":
			return <Bot size={size} className={className} />;
		case "sparkles":
		default:
			return <Sparkles size={size} className={className} />;
	}
}
