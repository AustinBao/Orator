import React, { forwardRef } from 'react';

const AboutUs = forwardRef((props, ref) => {
  return (
    <div ref={ref} className="flex flex-col justify-center items-center w-full">
      <h1 className="text-5xl my-10 text-center w-4/10">About Us</h1>
      <p className="text-lg">asdasd</p>
    </div>
  );
});

export default AboutUs;
