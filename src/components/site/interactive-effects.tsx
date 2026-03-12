"use client";

import { useEffect, useRef } from "react";

export function InteractiveEffects({ backgroundImageUrl }: { backgroundImageUrl: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const isMobile = window.innerWidth <= 768;
    const cursorEye = document.getElementById("cursor-eye");
    const cursorGlow = document.getElementById("cursor-glow");

    if (!isMobile && cursorEye && cursorGlow) {
      const mouseHandler = (e: MouseEvent) => {
        const { clientX, clientY } = e;
        cursorEye.style.left = `${clientX}px`;
        cursorEye.style.top = `${clientY}px`;
        cursorGlow.animate({ left: `${clientX}px`, top: `${clientY}px` }, { duration: 500, fill: "forwards" });
      };

      document.addEventListener("mousemove", mouseHandler);

      document.querySelectorAll("a, button, .member-card, .video-container, .concert-row").forEach((el) => {
        el.addEventListener("mouseenter", () => {
          cursorEye.style.width = "60px";
          cursorEye.style.height = "60px";
          cursorEye.style.backgroundColor = "rgba(0, 229, 255, 0.1)";
        });

        el.addEventListener("mouseleave", () => {
          cursorEye.style.width = "20px";
          cursorEye.style.height = "20px";
          cursorEye.style.backgroundColor = "transparent";
        });
      });

      return () => document.removeEventListener("mousemove", mouseHandler);
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const isMobile = window.innerWidth <= 768;
    let stars: Array<{ x: number; y: number; size: number; opacity: number; speed: number }> = [];
    let frame = 0;

    const initCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      stars = [];
      const max = isMobile ? 50 : 100;

      for (let i = 0; i < max; i += 1) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 1.2,
          opacity: Math.random(),
          speed: Math.random() * 0.15,
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const star of stars) {
        ctx.fillStyle = `rgba(0, 229, 255, ${star.opacity * 0.4})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();

        star.y -= star.speed;
        if (star.y < 0) star.y = canvas.height;
      }

      frame = requestAnimationFrame(draw);
    };

    initCanvas();
    draw();

    window.addEventListener("resize", initCanvas);
    return () => {
      window.removeEventListener("resize", initCanvas);
      cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) entry.target.classList.add("active");
        }
      },
      { threshold: 0.1 },
    );

    document.querySelectorAll(".reveal-text").forEach((el) => revealObserver.observe(el));

    const scrollHandler = () => {
      const scrolled = window.pageYOffset;
      const bg = document.querySelector<HTMLElement>(".void-image-bg");
      if (!bg) return;
      const bgScale = 1.1 + scrolled * 0.00005;
      const bgTranslate = scrolled * 0.02;
      bg.style.transform = `scale(${bgScale}) translateY(${bgTranslate}px)`;
    };

    window.addEventListener("scroll", scrollHandler);
    return () => {
      revealObserver.disconnect();
      window.removeEventListener("scroll", scrollHandler);
    };
  }, []);

  return (
    <>
      <div id="cursor-eye" />
      <div id="cursor-glow" />
      <canvas id="canvas-stars" ref={canvasRef} />
      <div className="void-image-bg" style={{ backgroundImage: `url(${backgroundImageUrl})` }} />
    </>
  );
}
