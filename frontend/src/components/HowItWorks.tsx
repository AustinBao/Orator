import React, { forwardRef } from 'react';
import Example from './ScrollingCards.tsx'

const HowItWorks = forwardRef((props, ref) => {
  return (
    <div ref={ref} className="relative flex flex-col justify-center items-center w-full py-20 bg-gradient-to-bl from-custom-orange via-white to-custom-pink overflow-hidden">
      <div className="backdrop-blur-lg bg-white/40 border border-white/60 rounded-3xl shadow-2xl px-16 py-12 mb-2">
        <h1 className="text-6xl font-bold text-center text-gray-900">Get Started in 4 Simple Steps</h1>
      </div>
      <Example />
    </div>
  );
});

export default HowItWorks;
