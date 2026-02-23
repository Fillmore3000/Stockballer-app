/**
 * TradingParticles - Web-only PixiJS Component
 * Real-time particle effects for trading activity visualization
 * 
 * Demonstrates:
 * - HTML5/WebGL framework experience (PixiJS)
 * - Real-time interactive experiences
 * - Game-like visual effects
 */
import React, { useEffect, useRef, useCallback, memo } from 'react';
import { Platform, View, StyleSheet } from 'react-native';

// Only import PixiJS on web
let Application: any;
let Graphics: any;
let Container: any;

if (Platform.OS === 'web') {
  const PIXI = require('pixi.js');
  Application = PIXI.Application;
  Graphics = PIXI.Graphics;
  Container = PIXI.Container;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: number;
  alpha: number;
  type: 'buy' | 'sell' | 'price';
}

interface TradingParticlesProps {
  width?: number;
  height?: number;
  intensity?: 'low' | 'medium' | 'high';
  onTrade?: (type: 'buy' | 'sell', amount: number) => void;
}

const COLORS = {
  buy: 0x22c55e,    // Green
  sell: 0xef4444,   // Red
  price: 0x3b82f6,  // Blue
  neutral: 0x6b7280, // Gray
};

/**
 * TradingParticles Component
 * Creates real-time particle effects for trading activity
 */
export const TradingParticles: React.FC<TradingParticlesProps> = memo(({
  width = 300,
  height = 200,
  intensity = 'medium',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<any>(null);
  const particlesRef = useRef<Particle[]>([]);
  const particleGraphicsRef = useRef<Map<number, any>>(new Map());
  const animationFrameRef = useRef<number>(0);

  const intensityMultiplier = {
    low: 0.5,
    medium: 1,
    high: 2,
  };

  const createParticle = useCallback((type: 'buy' | 'sell' | 'price', x?: number, y?: number): Particle => {
    const baseLife = 60 + Math.random() * 60;
    return {
      x: x ?? Math.random() * width,
      y: y ?? height + 10,
      vx: (Math.random() - 0.5) * 2,
      vy: -1 - Math.random() * 2,
      life: baseLife,
      maxLife: baseLife,
      size: 3 + Math.random() * 5,
      color: COLORS[type],
      alpha: 1,
      type,
    };
  }, [width, height]);

  const spawnParticleBurst = useCallback((type: 'buy' | 'sell', count: number = 10) => {
    const centerX = width / 2;
    const centerY = height / 2;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const speed = 2 + Math.random() * 3;
      const particle = createParticle(type, centerX, centerY);
      particle.vx = Math.cos(angle) * speed;
      particle.vy = Math.sin(angle) * speed;
      particlesRef.current.push(particle);
    }
  }, [width, height, createParticle]);

  // Initialize PixiJS
  useEffect(() => {
    if (Platform.OS !== 'web' || !containerRef.current) return;

    const initPixi = async () => {
      const app = new Application();
      await app.init({
        width,
        height,
        backgroundAlpha: 0,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });

      containerRef.current?.appendChild(app.canvas);
      appRef.current = app;

      // Create particle container
      const particleContainer = new Container();
      app.stage.addChild(particleContainer);

      // Animation loop
      const animate = () => {
        const mult = intensityMultiplier[intensity];

        // Spawn ambient particles
        if (Math.random() < 0.05 * mult) {
          const types: ('buy' | 'sell' | 'price')[] = ['buy', 'sell', 'price'];
          const type = types[Math.floor(Math.random() * types.length)];
          particlesRef.current.push(createParticle(type));
        }

        // Update particles
        particlesRef.current = particlesRef.current.filter((particle, index) => {
          particle.x += particle.vx;
          particle.y += particle.vy;
          particle.vy += 0.02; // Gravity
          particle.life--;
          particle.alpha = particle.life / particle.maxLife;

          // Get or create graphics
          let graphics = particleGraphicsRef.current.get(index);
          if (!graphics) {
            graphics = new Graphics();
            particleContainer.addChild(graphics);
            particleGraphicsRef.current.set(index, graphics);
          }

          // Draw particle
          graphics.clear();
          graphics.circle(particle.x, particle.y, particle.size * particle.alpha);
          graphics.fill({ color: particle.color, alpha: particle.alpha * 0.7 });

          // Add glow effect
          graphics.circle(particle.x, particle.y, particle.size * particle.alpha * 1.5);
          graphics.fill({ color: particle.color, alpha: particle.alpha * 0.3 });

          if (particle.life <= 0) {
            particleContainer.removeChild(graphics);
            particleGraphicsRef.current.delete(index);
            return false;
          }
          return true;
        });

        animationFrameRef.current = requestAnimationFrame(animate);
      };

      animate();
    };

    initPixi();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (appRef.current) {
        appRef.current.destroy(true, { children: true });
      }
    };
  }, [width, height, intensity, createParticle]);

  // Expose spawn function via ref or event
  useEffect(() => {
    // Simulate trading activity
    const interval = setInterval(() => {
      if (Math.random() < 0.3) {
        const type = Math.random() > 0.5 ? 'buy' : 'sell';
        spawnParticleBurst(type, 5 + Math.floor(Math.random() * 10));
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [spawnParticleBurst]);

  // Only render on web
  if (Platform.OS !== 'web') {
    return (
      <View style={[styles.container, { width, height }]}>
        {/* Fallback for native - could use Skia or Lottie */}
      </View>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        width,
        height,
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        zIndex: 1,
      }}
    />
  );
});

TradingParticles.displayName = 'TradingParticles';

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
