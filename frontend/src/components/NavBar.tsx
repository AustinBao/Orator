import React, { useRef } from 'react';
import GetStartedButton from './GetStartedButton';

interface NavBarProps {
  ProductDesc: React.RefObject<HTMLDivElement>;
  AboutUs: React.RefObject<HTMLDivElement>;
  HowItWorks: React.RefObject<HTMLDivElement>;
}

export default function NavBar({ ProductDesc, AboutUs, HowItWorks }: NavBarProps) {
  const navBarRef = useRef<HTMLDivElement>(null);

  const scrollToElement = (myRef: React.RefObject<HTMLDivElement>) => {
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
  };

  const buttonClass =
    'min-w-[100px] relative px-4 sm:px-6 py-2 rounded-full text-sm sm:text-base text-black bg-transparent transition duration-300 hover:text-white before:absolute before:inset-0 before:rounded-full before:p-[1px] before:bg-gradient-to-r before:from-indigo-400 before:to-purple-400 before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100 before:-z-10 overflow-hidden';

  return (
    <div
      ref={navBarRef}
      className="fixed top-2 left-1/2 -translate-x-1/2 flex flex-wrap justify-center items-center gap-4 sm:gap-8 md:gap-12 bg-white/70 backdrop-blur-md px-4 sm:px-8 py-2 rounded-full shadow-lg z-50"
    >
      <button className={buttonClass} onClick={() => scrollToElement(ProductDesc)}>
        Orator AI
      </button>
      <button className={buttonClass} onClick={() => scrollToElement(HowItWorks)}>
        How it Works
      </button>
      <button className={buttonClass} onClick={() => scrollToElement(AboutUs)}>
        About Us
      </button>
      <GetStartedButton>Get Started</GetStartedButton>
    </div>
  );
}
