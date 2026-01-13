'use client';

import { useState, useEffect } from 'react';

interface CountdownTimerProps {
  seconds: number;
  onComplete: () => void;
}

export function CountdownTimer({ seconds, onComplete }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState(seconds);

  useEffect(() => {
    if (timeLeft <= 0) {
      onComplete();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, onComplete]);

  const minutes = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;

  return (
    <span className="text-gray-600">
      {String(minutes).padStart(2, '0')}:{String(secs).padStart(2, '0')}
    </span>
  );
}
