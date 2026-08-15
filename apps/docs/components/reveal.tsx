"use client";

import { useLayoutEffect, useRef, type ComponentPropsWithoutRef } from "react";

type RevealDirection = "left" | "right" | "up";

interface RevealProps extends ComponentPropsWithoutRef<"div"> {
  delay?: number;
  direction?: RevealDirection;
  eager?: boolean;
}

interface FloatProps extends ComponentPropsWithoutRef<"div"> {
  delay?: number;
  drift?: number;
  duration?: number;
  lift?: number;
}

const startTransform: Record<RevealDirection, string> = {
  left: "translate3d(-28px, 0, 0)",
  right: "translate3d(28px, 0, 0)",
  up: "translate3d(0, 28px, 0)",
};

function canAnimate(element: HTMLElement): boolean {
  return (
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
    typeof element.animate === "function"
  );
}

export function Reveal({
  children,
  className,
  delay = 0,
  direction = "up",
  eager = false,
  ...props
}: RevealProps) {
  const elementRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const element = elementRef.current;
    if (!element || !canAnimate(element)) {
      return;
    }

    let animation: Animation | undefined;
    const play = () => {
      animation?.cancel();
      animation = element.animate(
        [
          { opacity: 0, transform: startTransform[direction] },
          { opacity: 1, transform: "translate3d(0, 0, 0)" },
        ],
        {
          delay,
          duration: 760,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          fill: "both",
        },
      );
    };

    if (eager || typeof IntersectionObserver === "undefined") {
      play();
      return () => animation?.cancel();
    }

    animation = element.animate(
      [
        { opacity: 0, transform: startTransform[direction] },
        { opacity: 0, transform: startTransform[direction] },
      ],
      { duration: 1, fill: "both" },
    );

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        play();
        observer.disconnect();
      },
      { rootMargin: "0px 0px 12%", threshold: 0.01 },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
      animation?.cancel();
    };
  }, [delay, direction, eager]);

  return (
    <div className={className} ref={elementRef} {...props}>
      {children}
    </div>
  );
}

export function Float({
  children,
  className,
  delay = 0,
  drift = 10,
  duration = 5200,
  lift = 16,
  ...props
}: FloatProps) {
  const elementRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const element = elementRef.current;
    if (!element || !canAnimate(element)) {
      return;
    }

    const animation = element.animate(
      [
        { transform: "translate3d(0, 0, 0) rotate(-2deg)" },
        {
          offset: 0.3,
          transform: `translate3d(${drift * 0.6}px, ${-lift * 0.65}px, 0) rotate(4deg)`,
        },
        {
          offset: 0.6,
          transform: `translate3d(${-drift * 0.25}px, ${-lift}px, 0) rotate(-3deg)`,
        },
        {
          offset: 0.82,
          transform: `translate3d(${-drift * 0.55}px, ${-lift * 0.35}px, 0) rotate(2deg)`,
        },
        { transform: "translate3d(0, 0, 0) rotate(-2deg)" },
      ],
      {
        delay,
        duration,
        easing: "ease-in-out",
        iterations: Infinity,
      },
    );

    return () => animation.cancel();
  }, [delay, drift, duration, lift]);

  return (
    <div
      className={`motion-safe:will-change-transform ${className ?? ""}`}
      ref={elementRef}
      {...props}
    >
      {children}
    </div>
  );
}
