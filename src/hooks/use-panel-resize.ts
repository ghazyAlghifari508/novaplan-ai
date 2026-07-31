import { useState, useEffect, useCallback } from "react";

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

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingRight) {
        setRightWidth(Math.max(minRight, Math.min(window.innerWidth - e.clientX, maxRight)));
      }
      if (isDraggingLeft) {
        setLeftWidth(Math.max(minLeft, Math.min(e.clientX, maxLeft)));
      }
    };

    const handleMouseUp = () => {
      setIsDraggingRight(false);
      setIsDraggingLeft(false);
    };

    if (isDraggingRight || isDraggingLeft) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "none";
    } else {
      document.body.style.userSelect = "";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "";
    };
  }, [isDraggingRight, isDraggingLeft, minRight, maxRight, minLeft, maxLeft]);

  const onStartDragRight = useCallback(() => setIsDraggingRight(true), []);
  const onStartDragLeft = useCallback(() => setIsDraggingLeft(true), []);

  return {
    rightWidth,
    leftWidth,
    isDraggingRight,
    isDraggingLeft,
    onStartDragRight,
    onStartDragLeft,
  };
}
