import { motion } from 'framer-motion';
import GetStartedButton from '../GetStartedButton.tsx';

export default function Hero() {
  return (
    <div className="relative w-full h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-custom-pink via-white to-custom-orange">
      {/* Text content sliding from left */}
      <motion.div
        initial={{ x: -1000, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className="absolute left-60 top-1/4 z-10"
      >
        <h1 className="text-[11.5rem] font-bold mb-4 leading-none">Orator</h1>
        <p className="text-5xl italic mb-10 text-gray-700">/ˈôrədər/</p>
        <div className="flex items-start gap-6 mb-20">
          <span className="text-6xl">•</span>
          <p className="text-4xl max-w-2xl">
            a public speaker, especially one who is eloquent or skilled.
          </p>
        </div>
        <div className="ml-2 scale-150 origin-left">
          <GetStartedButton>Get Started</GetStartedButton>
        </div>
      </motion.div>

      {/* Greek statue image sliding from right */}
      <motion.div
        initial={{ x: 1000, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
        className="absolute right-0 bottom-0 h-[90vh] flex items-end justify-end"
      >
        <img
          src="/greek-statue.jpg"
          alt="Greek Orator Statue"
          className="h-full w-auto object-contain object-bottom max-w-[60vw]"
          onError={(e) => {
            // Fallback if image not found
            e.currentTarget.style.display = 'none';
          }}
        />
      </motion.div>

      {/* Tagline at the top right */}
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 1 }}
        className="absolute top-70 right-80 z-20"
      >
        <p className="text-4xl font-light">Where words meet mastery.</p>
      </motion.div>
    </div>
  );
}

