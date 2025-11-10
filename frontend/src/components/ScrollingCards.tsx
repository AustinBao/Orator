import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

const Example = () => {
  return (
    <div className="w-full">
      <StackedCards />
    </div>
  );
};

const StackedCards = () => {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 0.8", "end 0.2"]
  });

  return (
    <section ref={containerRef} className="relative py-20">
      <div className="max-w-7xl mx-auto px-20">
        {cards.map((card, index) => {
          const start = index * 0.15;
          const end = start + 0.2;
          
          return (
            <Card 
              key={card.id} 
              card={card} 
              index={index}
              progress={scrollYProgress}
              range={[start, end]}
            />
          );
        })}
      </div>
    </section>
  );
};

interface CardType {
  id: number;
  title: string;
  description: string;
}

const Card = ({ card, index: _index, progress, range }: { card: CardType; index: number; progress: any; range: number[] }) => {
  const x = useTransform(progress, range, [-200, 0]);
  const scale = useTransform(progress, range, [0.9, 1]);
  const opacity = useTransform(progress, range, [0, 1]);
  const rotate = useTransform(progress, range, [-5, 0]);

  return (
    <motion.div
      style={{
        x,
        scale,
        opacity,
        rotate,
      }}
      className="mb-12"
    >
      <div className="backdrop-blur-lg bg-white/40 border border-white/60 rounded-3xl shadow-2xl p-12 hover:bg-white/50 transition-all duration-300">
        <div className="flex items-center gap-8">
          <div className="text-8xl font-black text-custom-orange">
            {card.id}
          </div>
          <div className="flex-1">
            <h3 className="text-4xl font-bold text-gray-900 mb-4">
              {card.title}
            </h3>
            <p className="text-xl text-gray-800 leading-relaxed">
              {card.description}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Example;

const cards = [
  {
    id: 1,
    title: "Click 'Get Started'",
    description: "Begin your journey by clicking the Get Started button. Set up your presentation environment in seconds.",
  },
  {
    id: 2,
    title: "Upload Your Script",
    description: "Upload or type your presentation script. Highlight key points you want to emphasize during your speech.",
  },
  {
    id: 3,
    title: "Connect Your Devices",
    description: "Connect your Muse S headset for EEG monitoring and enable your camera for gesture tracking.",
  },
  {
    id: 4,
    title: "Present with Confidence",
    description: "Start presenting! Get real-time feedback on your body language, speech, and mental state as you go.",
  },
];
