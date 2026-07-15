import React, { useState, useEffect } from 'react';

const CHAR_SET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 %:-➔/'.split('');

export default function LivingStatusBoard({ value, length }) {
  const targetStr = (value !== undefined && value !== null) ? String(value) : '';
  const displayLength = length || targetStr.length || 1;
  
  // Pad or truncate string to match fixed length
  const getPaddedString = (str) => {
    return str.padEnd(displayLength, ' ').substring(0, displayLength);
  };

  const paddedTarget = getPaddedString(targetStr);
  const [currentDisplay, setCurrentDisplay] = useState(getPaddedString(''));
  const [isFlashing, setIsFlashing] = useState(false);

  useEffect(() => {
    // 1. Check for reduced motion media query
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      // Instant transition + flash highlight
      setCurrentDisplay(paddedTarget);
      setIsFlashing(true);
      const timer = setTimeout(() => setIsFlashing(false), 500);
      return () => clearTimeout(timer);
    }

    // 2. Play Split-Flap mechanical transition
    let frame = 0;
    const maxFrames = 15; // length of flap transition
    const intervalTime = 40; // timing speed

    // Set array of current cells
    let currentCells = currentDisplay.split('');
    const targetCells = paddedTarget.split('');

    const interval = setInterval(() => {
      frame++;
      
      const newCells = currentCells.map((char, index) => {
        // Settle characters one-by-one or when they reach the target
        if (char === targetCells[index]) {
          return char;
        }
        
        // Random chance of settling, or must settle at maxFrames
        if (frame >= maxFrames || (frame > 5 && Math.random() < 0.25)) {
          return targetCells[index];
        }
        
        // Return a random character from character set to simulate mechanical spin
        return CHAR_SET[Math.floor(Math.random() * CHAR_SET.length)];
      });

      currentCells = newCells;
      setCurrentDisplay(newCells.join(''));

      // If all cells reached target, clear interval
      if (newCells.join('') === paddedTarget) {
        clearInterval(interval);
      }
    }, intervalTime);

    return () => clearInterval(interval);
  }, [value, displayLength]);

  return (
    <div 
      className={`split-flap-board transition-all duration-300 ${
        isFlashing ? 'border-amber-400 bg-amber-950/20' : ''
      }`}
      role="status"
      aria-live="polite"
    >
      {currentDisplay.split('').map((char, idx) => (
        <div key={idx} className="split-flap-cell">
          <span className="relative z-10">{char}</span>
          {/* Split-Flap divider line */}
          <div className="absolute top-1/2 left-0 right-0 h-px bg-black opacity-60 z-0" />
        </div>
      ))}
    </div>
  );
}
