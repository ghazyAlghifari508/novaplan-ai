"use client";

import { useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

const VIDEO_SOURCES = [
  "https://d8j0ntlcm91z4.cloudfront.net/assets/video/hero-loop.mp4",
];

const FADE_DURATION = 250;
const REPLAY_DELAY = 100;

interface VideoBackgroundProps {
  className?: string;
}

export function VideoBackground({ className }: VideoBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fadingOutRef = useRef(false);
  const rafRef = useRef<number>(0);

  const fadeIn = useCallback(() => {
    if (!videoRef.current || fadingOutRef.current) return;

    cancelAnimationFrame(rafRef.current);
    const start = performance.now();

    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / FADE_DURATION, 1);
      if (videoRef.current) {
        videoRef.current.style.opacity = String(progress);
      }
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
  }, []);

  const fadeOut = useCallback(() => {
    if (!videoRef.current) return;
    fadingOutRef.current = true;

    cancelAnimationFrame(rafRef.current);
    const start = performance.now();

    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = 1 - Math.min(elapsed / FADE_DURATION, 1);
      if (videoRef.current) {
        videoRef.current.style.opacity = String(progress);
      }
      if (progress > 0) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        fadingOutRef.current = false;
      }
    };

    rafRef.current = requestAnimationFrame(animate);
  }, []);

  const handleEnded = useCallback(() => {
    fadeOut();
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => {});
        fadeIn();
      }
    }, REPLAY_DELAY);
  }, [fadeOut, fadeIn]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.play().catch(() => {});

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn("absolute inset-0 overflow-hidden", className)}
    >
      <video
        ref={videoRef}
        className="absolute left-0 top-0 h-[115%] w-[115%] object-cover"
        style={{
          objectPosition: "top center",
          opacity: 0,
        }}
        muted
        loop={false}
        playsInline
        preload="auto"
        onLoadedData={fadeIn}
        onEnded={handleEnded}
      >
        {VIDEO_SOURCES.map((src) => (
          <source key={src} src={src} type="video/mp4" />
        ))}
      </video>

      <div className="absolute inset-0 bg-overlay-dark backdrop-blur-[2px]" />
    </div>
  );
}