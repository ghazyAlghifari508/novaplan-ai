/**
 * Canvas zoom and pan hook.
 * Provides zoom level, pan position, and control functions.
 */

import { useCallback, useRef, useState } from "react";

interface UseCanvasZoomOptions {
	minZoom?: number;
	maxZoom?: number;
	initialZoom?: number;
}

export function useCanvasZoom({
	minZoom = 0.54,
	maxZoom = 1.54,
	initialZoom = 1,
}: UseCanvasZoomOptions = {}) {
	const [zoom, setZoom] = useState(initialZoom);
	const [pan, setPan] = useState({ x: 0, y: 0 });
	const isPanningRef = useRef(false);
	const lastPanRef = useRef({ x: 0, y: 0 });

	const zoomIn = useCallback(() => {
		setZoom((prev) => Math.min(prev * 1.2, maxZoom));
	}, [maxZoom]);

	const zoomOut = useCallback(() => {
		setZoom((prev) => Math.max(prev / 1.2, minZoom));
	}, [minZoom]);

	const resetZoom = useCallback(() => {
		setZoom(initialZoom);
		setPan({ x: 0, y: 0 });
	}, [initialZoom]);

	const startPan = useCallback((e: React.PointerEvent) => {
		// Only react to primary button / touch / pen contact.
		if (e.pointerType === "mouse" && e.buttons !== 1) return;
		isPanningRef.current = true;
		lastPanRef.current = { x: e.clientX, y: e.clientY };
		// ponytail: capture so we keep receiving move events outside the element.
		(e.currentTarget as Element | null)?.setPointerCapture?.(e.pointerId);
	}, []);

	const updatePan = useCallback((e: React.PointerEvent) => {
		if (!isPanningRef.current) return;

		const deltaX = e.clientX - lastPanRef.current.x;
		const deltaY = e.clientY - lastPanRef.current.y;

		setPan((prev) => ({
			x: prev.x + deltaX,
			y: prev.y + deltaY,
		}));

		lastPanRef.current = { x: e.clientX, y: e.clientY };
	}, []);

	const endPan = useCallback(() => {
		isPanningRef.current = false;
	}, []);

	// ponytail: no e.preventDefault(), causes passive listener warning.
	// Canvas div uses touch-action: none + overflow-hidden to block native scroll.
	const onWheel = useCallback(
		(e: React.WheelEvent) => {
			const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
			setZoom((prev) => Math.min(maxZoom, Math.max(minZoom, prev * factor)));
		},
		[minZoom, maxZoom],
	);

	/**
	 * Keyboard pan nudge for arrow-key navigation (a11y).
	 * ponytail: fixed 40px step; add acceleration if needed.
	 */
	const nudgePan = useCallback((key: string, step = 40) => {
		setPan((prev) => {
			switch (key) {
				case "ArrowUp":
					return { ...prev, y: prev.y + step };
				case "ArrowDown":
					return { ...prev, y: prev.y - step };
				case "ArrowLeft":
					return { ...prev, x: prev.x + step };
				case "ArrowRight":
					return { ...prev, x: prev.x - step };
				default:
					return prev;
			}
		});
	}, []);

	return {
		zoom,
		pan,
		setZoom,
		setPan,
		zoomIn,
		zoomOut,
		resetZoom,
		startPan,
		updatePan,
		endPan,
		nudgePan,
		onWheel,
		minZoom,
		maxZoom,
	};
}
