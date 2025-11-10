import React, { forwardRef } from 'react';
import Example from './ScrollingCards.tsx'

const HowItWorks = forwardRef((props, ref) => {
  return (
    <div ref={ref} className="flex flex-col justify-center items-center w-full">
      <h1 className="text-5xl text-center my-10">Get Started in 3 Simple Steps</h1>
      <Example />
      <p className="text-lg">
    TRAVEL SUITCASE WITH WHEELS, IT'S ALL IN THE DETAILS: YKK high-quality explosion-proof zipper, smooth and silent 360° spinner wheels and ergonomically designed 3-step aluminum telescopic handle. Let the durability and practicality of the entire suitcase reach an unparalleled height. Vipbox redefines the suitcase
    TRAVEL SAFELY, LUGGAGE SETS WITH TSA LOCK: TSA approved integrated lock and aviation grade polycarbonate shell ensure your belongings are always safe and reliable. You can pass through customs without worrying about customs inspection. Make every trip easy and perfect
      LUGGAGE SETS 3 PIECE, 3-YEARS GLOBAL VIP WARRANTY: Comfortable travel, worry-free use. These confidences come from Vipbox's excellent standards, VIP exclusive 1V1 service and 3-years global User support. If you have any questions, please feel free to let us know. Where every mile counts
    SUPER DURABLE, PC LIGHTWEIGHT HARDSHELL LUGGAGE: 100% Polycarbonate (PC) material travel suitcase is the representative of lightweight and durable. Every part of the luggage and even every screw is strictly inspected and then sent to you after passing professional luggage testing, designed to withstand the harshest environments. Durability will be proven by time
    EXPANDABLE LUGGAGE LARGE CAPACITY, TRAVELER'S FAVORITE: 24" and 28" expandable +25% space, never bother packing the last few items again. Full zippered compartments and X-cross straps provide practical storage space for your items. Keep your items organized after every trip!
    TRAVEL SUITCASE WITH WHEELS, IT'S ALL IN THE DETAILS: YKK high-quality explosion-proof zipper, smooth and silent 360° spinner wheels and ergonomically designed 3-step aluminum telescopic handle. Let the durability and practicality of the entire suitcase reach an unparalleled height. Vipbox redefines the suitcase
    TRAVEL SAFELY, LUGGAGE SETS WITH TSA LOCK: TSA approved integrated lock and aviation grade polycarbonate shell ensure your belongings are always safe and reliable. You can pass through customs without worrying about customs inspection. Make every trip easy and perfect   LUGGAGE SETS 3 PIECE, 3-YEARS GLOBAL VIP WARRANTY: Comfortable travel, worry-free use. These confidences come from Vipbox's excellent standards, VIP exclusive 1V1 service and 3-years global User support. If you have any questions, please feel free to let us know. Where every mile counts
    SUPER DURABLE, PC LIGHTWEIGHT HARDSHELL LUGGAGE: 100% Polycarbonate (PC) material travel suitcase is the representative of lightweight and durable. Every part of the luggage and even every screw is strictly inspected and then sent to you after passing professional luggage testing, designed to withstand the harshest environments. Durability will be proven by time

      </p>
    </div>
  );
});

export default HowItWorks;
