import NavBar from '../components/NavBar'
import Hero from '../components/Hero'
import ProductDescription from '../components/ProductDescription'
import AboutUs from '../components/AboutUs'
import HowItWorks from '../components/HowItWorks'
import Footer from '../components/Footer'
import React, { useRef } from 'react';


function Home() {

  const productDescRef = useRef(null);
  const howItWorksRef = useRef(null);
  const aboutUsRef = useRef(null);

  return (
    <div className="min-h-screen w-full flex flex-col items-center">
      <NavBar ProductDesc={productDescRef} AboutUs={aboutUsRef} HowItWorks={howItWorksRef} />
      <Hero />
      <div className="flex flex-col items-center w-full">
        <ProductDescription ref={productDescRef} />
        <HowItWorks ref={howItWorksRef} />
        <AboutUs ref={aboutUsRef} />
        <Footer />
      </div>
    </div>
  );
}

export default Home
