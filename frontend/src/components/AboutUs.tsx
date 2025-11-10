import React, { useRef } from 'react';
import GetStartedButton from './GetStartedButton';

export default function NavBar({ ProductDesc, AboutUs, HowItWorks }) {
  const navBarRef = useRef(null)
  const scrollToElement = (myRef) => {
    let offset = 100;
    if (navBarRef.current) {
      offset = navBarRef.current.offsetHeight * 2;
    }
    if (myRef.current) {
      window.scrollTo({
        top: myRef.current.offsetTop - offset,
        behavior: 'smooth',
      });
    }
  }

  const buttonClass = "min-w-30 relative px-6 py-2 rounded-full text-black bg-transparent transition duration-300 hover:text-white before:absolute before:inset-0 before:rounded-full before:p-[1px] before:bg-gradient-to-r before:from-indigo-400 before:to-purple-400 before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100 before:-z-10 overflow-hidden"

  return (
    <div ref={navBarRef} className="
    fixed top-4 left-1/2 -translate-x-1/2
    flex items-center justify-center
    bg-white/80 backdrop-blur-md
    px-6 sm:px-10 py-2
    rounded-full
    gap-6 sm:gap-12
    shadow-md
    z-50
  ">
      <button className={buttonClass} onClick={() => scrollToElement(ProductDesc) }>Orator AI</button>
      <button className={buttonClass} onClick={() => scrollToElement(HowItWorks)}>How it Works</button>
      <button className={buttonClass} onClick={() => scrollToElement(AboutUs)}>About Us</button>
      <GetStartedButton>Get Started</GetStartedButton>
    </div>
  );
}
