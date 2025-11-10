import React, { forwardRef } from 'react';
import Example from './ScrollingCards.tsx'

const HowItWorks = forwardRef((props, ref) => {
  return (
    <div ref={ref} className="flex flex-col justify-center items-center w-full">
      <h1 className="text-5xl text-center my-10">Get Started in 4 Simple Steps</h1>
      <Example />
      <p className="text-lg">
      </p>
    </div>
  );
});

export default HowItWorks;
