import React, { useEffect, useState, useRef } from "react";
import { motion } from "motion/react";
import { TrendingUp, TrendingDown } from "lucide-react";

interface AnimatedNumberProps {
  value: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  duration?: number;
  decimals?: number;
  showTrendBadge?: boolean;
  animateOnMount?: boolean;
}

export default function AnimatedNumber({
  value,
  prefix = "",
  suffix = "",
  className = "",
  duration = 1000,
  decimals = 2,
  showTrendBadge = false,
  animateOnMount = true,
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(animateOnMount ? 0 : value);
  const [trend, setTrend] = useState<"up" | "down" | null>(null);
  const prevValueRef = useRef(animateOnMount ? 0 : value);
  const isFirstMountRef = useRef(true);
  const animationFrameRef = useRef<number | null>(null);
  const trendTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const isFirstMount = isFirstMountRef.current;
    isFirstMountRef.current = false;

    const startValue = prevValueRef.current;
    const endValue = value;
    prevValueRef.current = value;

    if (startValue !== endValue || (isFirstMount && animateOnMount && endValue !== 0)) {
      if (!isFirstMount) {
        if (endValue > startValue) {
          setTrend("up");
        } else if (endValue < startValue) {
          setTrend("down");
        }

        if (trendTimeoutRef.current) {
          clearTimeout(trendTimeoutRef.current);
        }
        trendTimeoutRef.current = setTimeout(() => {
          setTrend(null);
        }, 1800);
      }

      const animDuration = duration;
      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / animDuration, 1);

        // Ease-out Quartic (very smooth and noticeable rolling effect)
        const ease = 1 - Math.pow(1 - progress, 4);
        const current = startValue + (endValue - startValue) * ease;

        setDisplayValue(current);

        if (progress < 1) {
          animationFrameRef.current = requestAnimationFrame(animate);
        } else {
          setDisplayValue(endValue);
        }
      };

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      animationFrameRef.current = requestAnimationFrame(animate);
    } else {
      setDisplayValue(endValue);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (trendTimeoutRef.current) {
        clearTimeout(trendTimeoutRef.current);
      }
    };
  }, [value, duration, animateOnMount]);

  const formattedValue = displayValue.toLocaleString("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span className={`inline-flex items-center gap-1.5 transition-colors duration-300 ${className}`}>
      <span>
        {prefix}
        {formattedValue}
        {suffix}
      </span>

      {showTrendBadge && trend && (
        <motion.span
          initial={{ opacity: 0, scale: 0.7, y: trend === "up" ? 4 : -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.7 }}
          transition={{ duration: 0.3 }}
          className={`inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm ${
            trend === "up"
              ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
              : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
          }`}
        >
          {trend === "up" ? (
            <TrendingUp className="w-3 h-3" />
          ) : (
            <TrendingDown className="w-3 h-3" />
          )}
        </motion.span>
      )}
    </span>
  );
}
