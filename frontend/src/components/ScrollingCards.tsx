import { motion, useTransform, useScroll } from "framer-motion";
import { useRef } from "react";
import GetStartedButton from "./GetStartedButton"

const Example = () => {
  return (
    <div className="">
      <HorizontalScrollCarousel />
    </div>
  );
};

const HorizontalScrollCarousel = () => {
  const targetRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: targetRef,
  });

  const x = useTransform(scrollYProgress, [0, 1], ["50%", "-80%"]);

  return (
    <section ref={targetRef} className="relative h-[250vh]">
      <div className="sticky top-0 flex h-screen w-screen items-center overflow-hidden bg-gradient-to-b from-transparent via-pink-100 to-transparent">
        <motion.div style={{ x }} className="flex gap-4">
          {cards.map((card) => {
            return <Card card={card} key={card.id} />;
          })}
        </motion.div>
      </div>
    </section>
  );
};

const Card = ({ card }) => {
  return (
    <div
      key={card.id}
      className="group relative h-[450px] w-[600px] overflow-hidden bg-gradient-to-br from-rose-50/80 via-pink-100/40 to-transparent shadow-lg rounded-xl"
    >
      <div
        style={{
          backgroundImage: `url(${card.url})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
        className="absolute inset-0 z-0 transition-transform duration-300 group-hover:scale-110"
      ></div>
      <div className="absolute inset-0 z-10 grid place-content-center">
        <p className="p-8 text-6xl font-black uppercase text-slate-800 backdrop-blur-lg font-bold">
          {card.title}
        </p>
        <div className="p-8">
          {card.id === 1 && <GetStartedButton>Get Started</GetStartedButton>}
        </div>
      </div>
    </div>
  );
};

export default Example;

const cards = [
  {
    url: "/imgs/abstract/1.jpg",
    title: "1. Click 'Get Started'",
    id: 1,
  },
  {
    url: "/imgs/abstract/2.jpg",
    title: "2. Upload Your Script",
    id: 2,
  },
  {
    url: "/imgs/abstract/3.jpg",
    title: "3. Press 'Start Recording'",
    id: 3,
  },
  {
    url: "/imgs/abstract/4.jpg",
    title: "4. Present!",
    id: 4,
  },
];
