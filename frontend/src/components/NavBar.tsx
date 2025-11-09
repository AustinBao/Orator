import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export default function NavBar({ ProductDesc, AboutUs, HowItWorks }) {

  const navigate = useNavigate();

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
    <div ref={navBarRef} className="fixed outline-solid outline-sky-100 bg-white backdrop-blur-md px-8 py-2 mx-60 my-2 rounded-full space-x-20">
      <button className={buttonClass} onClick={() => scrollToElement(ProductDesc) }>Orator AI</button>
      <button className={buttonClass} onClick={() => scrollToElement(HowItWorks)}>How it Works</button>
      <button className={buttonClass} onClick={() => scrollToElement(AboutUs)}>About Us</button>
      <button className="text-white bg-gradient-to-br from-pink-500 to-orange-400 hover:bg-gradient-to-bl focus:ring-4 focus:outline-none focus:ring-pink-200 dark:focus:ring-pink-800 font-medium rounded-full px-6 py-2 text-center" onClick={() => navigate("/app") }>Get Started</button>
    </div>
  );
}
