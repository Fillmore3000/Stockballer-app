/**
 * AnimatedPriceChart - Web PixiJS Component
 * Real-time animated price chart with WebGL rendering
 * 
 * Demonstrates:
 * - HTML5/WebGL framework experience (PixiJS)
 * - Real-time data visualization
 * - Game-engine style rendering loop
 * - Interactive graphics programming
 */
import React, { useEffect, useRef, useCallback, memo, useState } from 'react';
import { Platform, View, StyleSheet, Text } from 'react-native';

// Only import PixiJS on web
let Application: any;
let Graphics: any;
let Container: any;
let TextPIXI: any;

if (Platform.OS === 'web') {
  const PIXI = require('pixi.js');
  Application = PIXI.Application;
  Graphics = PIXI.Graphics;
  Container = PIXI.Container;
  TextPIXI = PIXI.Text;
}

interface PricePoint {
  timestamp: number;
  price: number;
}

interface AnimatedPriceChartProps {
  data: PricePoint[];
  width?: number;
  height?: number;
  lineColor?: number;
  fillColor?: number;
  showGrid?: boolean;
  animated?: boolean;
}

const COLORS = {
  up: 0x22c55e,
  down: 0xef4444,
  neutral: 0x3b82f6,
  grid: 0x374151,
  text: 0x9ca3af,
};

/**
 * AnimatedPriceChart Component
 * Renders an animated price chart using PixiJS WebGL
 */
export const AnimatedPriceChart: React.FC<AnimatedPriceChartProps> = memo(({
  data,
  width = 400,
  height = 200,
  lineColor,
  fillColor,
  showGrid = true,
  animated = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<any>(null);
  const animationRef = useRef<number>(0);
  const progressRef = useRef<number>(0);
  const [isInitialized, setIsInitialized] = useState(false);

  const padding = { top: 20, right: 20, bottom: 30, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Calculate price trend
  const priceChange = data.length >= 2 ? data[data.length - 1].price - data[0].price : 0;
  const trendColor = lineColor ?? (priceChange >= 0 ? COLORS.up : COLORS.down);
  const trendFill = fillColor ?? (priceChange >= 0 ? 0x22c55e20 : 0xef444420);

  // Normalize data for chart
  const normalizeData = useCallback(() => {
    if (data.length === 0) return [];

    const prices = data.map(d => d.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;

    return data.map((point, i) => ({
      x: padding.left + (i / (data.length - 1 || 1)) * chartWidth,
      y: padding.top + chartHeight - ((point.price - minPrice) / priceRange) * chartHeight,
      price: point.price,
      timestamp: point.timestamp,
    }));
  }, [data, chartWidth, chartHeight, padding]);

  // Draw grid
  const drawGrid = useCallback((graphics: any) => {
    graphics.clear();

    // Horizontal grid lines
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartHeight / 4) * i;
      graphics.moveTo(padding.left, y);
      graphics.lineTo(padding.left + chartWidth, y);
    }
    graphics.stroke({ color: COLORS.grid, alpha: 0.3, width: 1 });

    // Vertical grid lines
    for (let i = 0; i <= 6; i++) {
      const x = padding.left + (chartWidth / 6) * i;
      graphics.moveTo(x, padding.top);
      graphics.lineTo(x, padding.top + chartHeight);
    }
    graphics.stroke({ color: COLORS.grid, alpha: 0.2, width: 1 });
  }, [chartWidth, chartHeight, padding]);

  // Draw price line with animation
  const drawPriceLine = useCallback((graphics: any, points: any[], progress: number) => {
    if (points.length < 2) return;

    graphics.clear();

    const visiblePoints = animated
      ? points.slice(0, Math.max(2, Math.floor(points.length * progress)))
      : points;

    // Draw fill
    graphics.moveTo(visiblePoints[0].x, padding.top + chartHeight);
    visiblePoints.forEach(point => {
      graphics.lineTo(point.x, point.y);
    });
    graphics.lineTo(visiblePoints[visiblePoints.length - 1].x, padding.top + chartHeight);
    graphics.closePath();
    graphics.fill({ color: trendColor, alpha: 0.1 });

    // Draw line
    graphics.moveTo(visiblePoints[0].x, visiblePoints[0].y);
    for (let i = 1; i < visiblePoints.length; i++) {
      graphics.lineTo(visiblePoints[i].x, visiblePoints[i].y);
    }
    graphics.stroke({ color: trendColor, width: 2 });

    // Draw current price dot
    if (visiblePoints.length > 0) {
      const lastPoint = visiblePoints[visiblePoints.length - 1];
      graphics.circle(lastPoint.x, lastPoint.y, 4);
      graphics.fill({ color: trendColor });

      // Glow effect
      graphics.circle(lastPoint.x, lastPoint.y, 8);
      graphics.fill({ color: trendColor, alpha: 0.3 });
    }
  }, [animated, trendColor, padding, chartHeight]);

  // Initialize PixiJS
  useEffect(() => {
    if (Platform.OS !== 'web' || !containerRef.current || data.length === 0) return;

    const initPixi = async () => {
      // Cleanup previous instance
      if (appRef.current) {
        appRef.current.destroy(true);
      }

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

      // Create containers
      const gridGraphics = new Graphics();
      const lineGraphics = new Graphics();
      app.stage.addChild(gridGraphics);
      app.stage.addChild(lineGraphics);

      // Draw grid
      if (showGrid) {
        drawGrid(gridGraphics);
      }

      // Get normalized points
      const points = normalizeData();
      progressRef.current = animated ? 0 : 1;

      // Animation loop
      const animate = () => {
        if (animated && progressRef.current < 1) {
          progressRef.current += 0.02;
        }
        drawPriceLine(lineGraphics, points, Math.min(progressRef.current, 1));

        if (animated && progressRef.current < 1) {
          animationRef.current = requestAnimationFrame(animate);
        }
      };

      animate();
      setIsInitialized(true);
    };

    initPixi();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (appRef.current) {
        appRef.current.destroy(true, { children: true });
        appRef.current = null;
      }
    };
  }, [data, width, height, showGrid, animated, drawGrid, drawPriceLine, normalizeData]);

  // Native fallback - could use Victory Native or Skia
  if (Platform.OS !== 'web') {
    return (
      <View style={[styles.container, { width, height }]}>
        <Text style={styles.fallbackText}>Chart available on web</Text>
      </View>
    );
  }

  // Empty data state
  if (data.length === 0) {
    return (
      <View style={[styles.container, { width, height }]}>
        <Text style={styles.fallbackText}>No data available</Text>
      </View>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        width,
        height,
        position: 'relative',
      }}
    />
  );
});

AnimatedPriceChart.displayName = 'AnimatedPriceChart';

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#111827',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackText: {
    color: '#6b7280',
    fontSize: 14,
  },
});
