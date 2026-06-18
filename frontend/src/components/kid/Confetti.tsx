import { useEffect, useRef, useCallback } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  rotationSpeed: number;
  shape: 'rect' | 'circle';
  life: number;
  maxLife: number;
}

const COLORS = ['#FFD700', '#FF4D4F', '#52C41A', '#4A90D9', '#722ED1', '#EB2F96', '#FA8C16', '#00D2FF'];

interface ConfettiProps {
  active: boolean;
  duration?: number;
}

export function Confetti({ active, duration = 3000 }: ConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);

  const createParticles = useCallback((count: number): Particle[] => {
    const particles: Particle[] = [];
    const canvas = canvasRef.current;
    if (!canvas) return particles;
    const w = canvas.width;
    const h = canvas.height;

    for (let i = 0; i < count; i++) {
      particles.push({
        x: w / 2 + (Math.random() - 0.5) * 200,
        y: h / 2 - 50,
        vx: (Math.random() - 0.5) * 12,
        vy: -Math.random() * 10 - 5,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: Math.random() * 8 + 4,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        shape: Math.random() > 0.5 ? 'rect' : 'circle',
        life: 1,
        maxLife: 1,
      });
    }
    return particles;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let startTime = 0;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15; // gravity
        p.vx *= 0.99;
        p.rotation += p.rotationSpeed;
        p.life -= 1 / (duration / 16);

        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;

        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      if (elapsed < duration || particles.length > 0) {
        animFrameRef.current = requestAnimationFrame(animate);
      }
    };

    if (active) {
      particlesRef.current = createParticles(80);
      animFrameRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [active, duration, createParticles]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    />
  );
}
