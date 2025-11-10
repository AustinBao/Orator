import React, { useRef } from 'react';
import NavBar from '../components/NavBar';
import ProductDescription from '../components/ProductDescription';
import AboutUs from '../components/AboutUs';
import HowItWorks from '../components/HowItWorks';
import Footer from '../components/Footer';

function Home() {
  const productDescRef = useRef<HTMLDivElement>(null);
  const howItWorksRef = useRef<HTMLDivElement>(null);
  const aboutUsRef = useRef<HTMLDivElement>(null);

  return (
    <div className="bg-indigo-50 min-h-screen flex flex-col items-center">
      {/* Navigation Bar (fixed, already handled internally) */}
      <div className="h-20" /> {/* spacer for the fixed NavBar */}

      {/* Main content container */}
      <main className="flex flex-col items-center w-full max-w-7xl px-4 sm:px-6 lg:px-8 gap-24">
        <ProductDescription ref={productDescRef} />
        <HowItWorks ref={howItWorksRef} />
        <AboutUs ref={aboutUsRef} />
      </main>

      {/* Footer section */}
      <div className="w-full mt-16">
        <Footer />
      </div>
    </div>
  );
}

export default Home;
