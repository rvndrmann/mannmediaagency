
import React, { useEffect, useRef } from "react";

interface Point {
  x: number;
  y: number;
  dx: number;
  dy: number;
  size: number;
  color: string;
  alpha: number;
}

export const SplashCursor = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointsRef = useRef<Point[]>([]);
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      // Force an initial point at the center when resizing
      mouseRef.current = {
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      };
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const addPoint = (x: number, y: number) => {
      // Using lighter, more pastel colors
      const colors = ["#E5DEFF", "#D3E4FD", "#E2CBFF"];
      pointsRef.current.push({
        x,
        y,
        dx: (Math.random() - 0.5) * 6,
        dy: (Math.random() - 0.5) * 6,
        size: Math.random() * 30 + 15,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 0.8, // Reduced initial alpha for more transparency
      });
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Add new points based on mouse position
      if (Math.random() < 0.5) {
        addPoint(mouseRef.current.x, mouseRef.current.y);
      }

      // Update and draw points
      pointsRef.current = pointsRef.current.filter((point) => {
        point.x += point.dx;
        point.y += point.dy;
        point.alpha *= 0.97;

        ctx.beginPath();
        ctx.arc(point.x, point.y, point.size, 0, Math.PI * 2);
        ctx.fillStyle = `${point.color}${Math.floor(point.alpha * 255).toString(16).padStart(2, '0')}`;
        ctx.fill();

        return point.alpha > 0.01;
      });

      requestAnimationFrame(animate);
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = {
        x: e.clientX,
        y: e.clientY,
      };
    };

    // Add initial points at the center
    for (let i = 0; i < 5; i++) {
      addPoint(window.innerWidth / 2, window.innerHeight / 2);
    }

    window.addEventListener("mousemove", handleMouseMove);
    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[1] opacity-70" // Reduced opacity from 90 to 70
    />
  );
};
