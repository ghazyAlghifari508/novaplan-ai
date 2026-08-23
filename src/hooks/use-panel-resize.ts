import { useCallback, useEffect, useRef, useState } from "react";

interface UsePanelResizeOptions {
	initialRightWidth?: number;
	minRight?: number;
	maxRight?: number;
	initialLeftWidth?: number;
	minLeft?: number;
	maxLeft?: number;
}

/**
 * Manage right chat panel width and left TOC sidebar width via drag handles.
 *
 * ponytail: mousemove can fire more often than the display refreshes. The
 * hovered position is transient, so it lives in a ref and is committed via
 * requestAnimationFrame - at most one React render per frame instead of one
 * per input event (see vercel-react-best-practices rerender-use-ref-transient-values).
 */
export function usePanelResize({
	initialRightWidth = 380,
	minRight = 280,
	maxRight = 800,
	initialLeftWidth = 240,
	minLeft = 140,
	maxLeft = 500,
}: UsePanelResizeOptions = {}) {
	const [rightWidth, setRightWidth] = useState(initialRightWidth);
	const [leftWidth, setLeftWidth] = useState(initialLeftWidth);
	const [isDraggingRight, setIsDraggingRight] = useState(false);
	const [isDraggingLeft, setIsDraggingLeft] = useState(false);

	// Refs mirror the dragging flags so listeners and flush read the latest
	// values without resubscribing on every flip.
	const draggingRightRef = useRef(false);
	const draggingLeftRef = useRef(false);
	const pendingXRef = useRef<number | null>(null);
	const rafRef = useRef<number | null>(null);

	useEffect(
		() => () => {
			if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
		},
		[],
	);

	const flushDrag = useCallback(() => {
		rafRef.current = null;
		const x = pendingXRef.current;
		if (x === null) return;
		pendingXRef.current = null;
		if (draggingRightRef.current) {
			setRightWidth(
				Math.max(minRight, Math.min(window.innerWidth - x, maxRight)),
			);
		} else if (draggingLeftRef.current) {
			setLeftWidth(Math.max(minLeft, Math.min(x, maxLeft)));
		}
	}, [minRight, maxRight, minLeft, maxLeft]);

	const handleMouseMove = useCallback(
		(e: MouseEvent) => {
			if (!draggingRightRef.current && !draggingLeftRef.current) return;
			pendingXRef.current = e.clientX;
			if (rafRef.current === null) {
				rafRef.current = requestAnimationFrame(flushDrag);
			}
		},
		[flushDrag],
	);

	const handleMouseUp = useCallback(() => {
		// Commit the final position first so the panel lands exactly under
		// the cursor, then tear down drag state.
		if (rafRef.current !== null) {
			cancelAnimationFrame(rafRef.current);
			rafRef.current = null;
		}
		flushDrag();
		draggingRightRef.current = false;
		draggingLeftRef.current = false;
		pendingXRef.current = null;
		setIsDraggingRight(false);
		setIsDraggingLeft(false);
	}, [flushDrag]);

	useEffect(() => {
		if (!(isDraggingRight || isDraggingLeft)) {
			document.body.style.userSelect = "";
			return;
		}

		document.body.style.userSelect = "none";
		document.addEventListener("mousemove", handleMouseMove);
		document.addEventListener("mouseup", handleMouseUp);

		return () => {
			document.removeEventListener("mousemove", handleMouseMove);
			document.removeEventListener("mouseup", handleMouseUp);
			document.body.style.userSelect = "";
		};
	}, [isDraggingRight, isDraggingLeft, handleMouseMove, handleMouseUp]);

	const onStartDragRight = useCallback(() => {
		draggingRightRef.current = true;
		setIsDraggingRight(true);
	}, []);

	const onStartDragLeft = useCallback(() => {
		draggingLeftRef.current = true;
		setIsDraggingLeft(true);
	}, []);

	return {
		rightWidth,
		leftWidth,
		isDraggingRight,
		isDraggingLeft,
		onStartDragRight,
		onStartDragLeft,
	};
}
