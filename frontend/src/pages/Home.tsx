import NavBar from '../components/NavBar'
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
    <div className="bg-indigo-50 min-h-screen w-full flex flex-col items-center w-full">
      <div className="flex flex-col items-center p-6 w-9/10 gap-16">
        <div className="h-10"></div> { /* adsfasdfadsf */ }
        <NavBar ProductDesc={productDescRef} AboutUs={aboutUsRef} HowItWorks={howItWorksRef} /> 
        <ProductDescription ref={productDescRef} />
        <HowItWorks ref={howItWorksRef} />
        <AboutUs ref={aboutUsRef} />
        <Footer />
      </div>
    </div>
  );
}

export default Home
