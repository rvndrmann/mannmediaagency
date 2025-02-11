
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
      const colors = ["#E2CBFF", "#393BB2", "#8B5CF6"];
      pointsRef.current.push({
        x,
        y,
        dx: (Math.random() - 0.5) * 6, // Increased speed
        dy: (Math.random() - 0.5) * 6, // Increased speed
        size: Math.random() * 30 + 15, // Increased size
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
      });
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Add new points based on mouse position
      if (Math.random() < 0.5) { // Increased frequency
        addPoint(mouseRef.current.x, mouseRef.current.y);
      }

      // Update and draw points
      pointsRef.current = pointsRef.current.filter((point) => {
        point.x += point.dx;
        point.y += point.dy;
        point.alpha *= 0.97; // Slightly slower fade

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
      className="pointer-events-none fixed inset-0 z-[1] opacity-90" // Increased opacity and adjusted z-index
    />
  );
};
