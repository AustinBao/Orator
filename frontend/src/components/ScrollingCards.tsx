import { motion, useTransform, useScroll } from "framer-motion";
import { useRef } from "react";
import GetStartedButton from "./GetStartedButton";

const Example = () => {
  return (
    <div className="w-full">
      <HorizontalScrollCarousel />
    </div>
  );
};

const HorizontalScrollCarousel = () => {
  const targetRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: targetRef,
  });

  const x = useTransform(scrollYProgress, [0, 1], ["20%", "-80%"]);

  return (
    <section ref={targetRef} className="relative h-[250vh]">
      <div className="sticky top-0 flex h-screen w-full items-center overflow-hidden bg-gradient-to-b from-transparent via-pink-100 to-transparent">
        <motion.div
          style={{ x }}
          className="flex gap-6 sm:gap-8 md:gap-12 lg:gap-16 px-4 sm:px-8"
        >
          {cards.map((card) => (
            <Card card={card} key={card.id} />
          ))}
        </motion.div>
      </div>
    </section>
  );
};

const Card = ({ card }) => {
  return (
    <div
      key={card.id}
      className="group relative h-[300px] sm:h-[400px] md:h-[450px] w-[260px] sm:w-[400px] md:w-[550px] lg:w-[600px] overflow-hidden bg-gradient-to-br from-rose-50/80 via-pink-100/40 to-transparent shadow-lg rounded-2xl flex flex-col justify-center items-center"
    >
      <div
        style={{
          backgroundImage: `url(${card.url})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
        className="absolute inset-0 z-0 transition-transform duration-300 group-hover:scale-110"
      ></div>

      <div className="absolute inset-0 z-10 flex flex-col justify-center items-center backdrop-blur-md bg-white/30 text-center p-4 sm:p-8">
        <p className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold uppercase text-slate-800 drop-shadow">
          {card.title}
        </p>
        {card.id === 1 && (
          <div className="mt-6">
            <GetStartedButton>Get Started</GetStartedButton>
          </div>
        )}
      </div>
    </div>
  );
};

export default Example;

const cards = [
  { url: "/imgs/abstract/1.jpg", title: "1. Click 'Get Started'", id: 1 },
  { url: "/imgs/abstract/2.jpg", title: "2. Upload Your Script", id: 2 },
  { url: "/imgs/abstract/3.jpg", title: "3. Press 'Start Recording'", id: 3 },
  { url: "/imgs/abstract/4.jpg", title: "4. Present!", id: 4 },
];
