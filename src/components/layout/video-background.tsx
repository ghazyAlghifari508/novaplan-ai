"use client";

import { useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

const VIDEO_URL = "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260329_050842_be71947f-f16e-4a14-810c-06e83d23ddb5.mp4";
const FADE_DURATION = 250;

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
    const startOpacity = parseFloat(videoRef.current.style.opacity || "0");

    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / FADE_DURATION, 1);
      const newOpacity = startOpacity + (1 - startOpacity) * progress;
      
      if (videoRef.current) {
        videoRef.current.style.opacity = String(newOpacity);
      }
      
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    rafRef.current = requestAnimationFrame(animate);
  }, []);

  const fadeOut = useCallback(() => {
    if (!videoRef.current || fadingOutRef.current) return;
    fadingOutRef.current = true;
    cancelAnimationFrame(rafRef.current);
    
    const start = performance.now();
    const startOpacity = parseFloat(videoRef.current.style.opacity || "1");

    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / FADE_DURATION, 1);
      const newOpacity = startOpacity * (1 - progress);
      
      if (videoRef.current) {
        videoRef.current.style.opacity = String(newOpacity);
      }
      
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    rafRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      if (!video.duration) return;
      const timeRemaining = video.duration - video.currentTime;
      if (timeRemaining <= 0.55 && !fadingOutRef.current) {
        fadeOut();
      }
    };

    const handleEnded = () => {
      if (videoRef.current) {
        videoRef.current.style.opacity = "0";
        setTimeout(() => {
          if (videoRef.current) {
            fadingOutRef.current = false;
            videoRef.current.currentTime = 0;
            videoRef.current.play().catch(() => {});
            fadeIn();
          }
        }, 100);
      }
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("ended", handleEnded);
    video.addEventListener("loadeddata", fadeIn);
    
    // Check if the video is already loaded (e.g., from cache)
    if (video.readyState >= 2) {
      fadeIn();
    }
    
    video.play().catch(() => {});

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("loadeddata", fadeIn);
      cancelAnimationFrame(rafRef.current);
    };
  }, [fadeIn, fadeOut]);

  return (
    <div
      ref={containerRef}
      className={cn("absolute inset-0 overflow-hidden", className)}
    >
      <video
        ref={videoRef}
        className="absolute left-1/2 top-0 h-[115%] w-[115%] -translate-x-1/2 object-cover"
        style={{
          objectPosition: "top center",
          opacity: 0,
        }}
        muted
        loop={false}
        playsInline
        preload="auto"
      >
        <source src={VIDEO_URL} type="video/mp4" />
      </video>
    </div>
  );
}