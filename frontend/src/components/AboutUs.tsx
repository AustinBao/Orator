import React, { forwardRef } from 'react';

const AboutUs = forwardRef((props, ref) => {
  const list_styling = "list-disc "
  return (
    <div ref={ref} className="flex flex-col justify-center items-center w-full">
      <h1 className="text-5xl my-10 text-center w-4/10">Features</h1>
      <h3 className="text-lg">
        <ul>
          <li className={list_styling} >Video Detection</li>
          <li className={list_styling}>Audio Detection</li>
          <li className={list_styling}>Live AI Helper</li>
          <li className={list_styling}>Slideshow Presentation</li>
        </ul>
      </h3>
    </div>
  );
});

export default AboutUs;
