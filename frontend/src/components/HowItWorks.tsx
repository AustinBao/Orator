import React, { forwardRef } from 'react';
import Example from './ScrollingCards.tsx';

const HowItWorks = forwardRef<HTMLDivElement>((props, ref) => {
  return (
    <div
      ref={ref}
      className="flex flex-col justify-center items-center w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16"
    >
      <h1 className="text-3xl sm:text-4xl lg:text-5xl text-center font-semibold my-8 sm:my-10">
        Get Started in 4 Simple Steps
      </h1>

      <Example />

      <p className="text-base sm:text-lg text-center mt-6 max-w-3xl text-gray-700">
        Follow these quick and interactive steps to begin using Orator — our platform will guide you through setup, training, and real-time feedback so you can deliver powerful, confident speeches with ease.
      </p>
    </div>
  );
});

export default HowItWorks;
