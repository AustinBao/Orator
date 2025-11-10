import NavBar from '../components/NavBar'
import Hero from '../components/Hero'
import ProductDescription from '../components/ProductDescription'
import AboutUs from '../components/AboutUs'
import HowItWorks from '../components/HowItWorks'
import Footer from '../components/Footer'
import { useRef } from 'react';


function Home() {

  const productDescRef = useRef<HTMLDivElement>(null);
  const howItWorksRef = useRef<HTMLDivElement>(null);
  const aboutUsRef = useRef<HTMLDivElement>(null);

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
