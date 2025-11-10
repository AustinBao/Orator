import { useRef } from 'react';
import GetStartedButton from './GetStartedButton';

interface NavBarProps {
  ProductDesc: React.RefObject<HTMLDivElement | null>;
  AboutUs: React.RefObject<HTMLDivElement | null>;
  HowItWorks: React.RefObject<HTMLDivElement | null>;
}

export default function NavBar({ ProductDesc: _ProductDesc, AboutUs, HowItWorks }: NavBarProps) {
  const navBarRef = useRef<HTMLDivElement>(null)
  const scrollToElement = (myRef: React.RefObject<HTMLDivElement | null>) => {
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

  const buttonClass = "min-w-30 relative px-6 py-2 rounded-full text-black text-lg font-bold bg-transparent transition duration-300 before:absolute before:inset-0 before:rounded-full before:p-[1px] before:bg-gradient-to-br before:from-custom-pink before:to-custom-orange before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100 before:-z-10 overflow-hidden"

  return (
    <div ref={navBarRef} className="fixed top-12 bg-white backdrop-blur-md px-8 py-2 mx-60 rounded-full space-x-20 z-50 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
      <button className={buttonClass} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Orator</button>
      <button className={buttonClass} onClick={() => scrollToElement(HowItWorks)}>How it Works</button>
      <button className={buttonClass} onClick={() => scrollToElement(AboutUs)}>Features</button>
      <GetStartedButton>Get Started</GetStartedButton>
    </div>
  );
}
