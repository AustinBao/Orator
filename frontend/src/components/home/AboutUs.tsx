import { forwardRef } from 'react';

const AboutUs = forwardRef<HTMLDivElement>((_props, ref) => {
  
  const box_styling = "backdrop-blur-lg border border-white/40 p-8 rounded-3xl shadow-2xl px-12 py-10 hover:backdrop-blur-xl transition-all duration-300 hover:scale-105 flex flex-col"
  const title_styling = "text-3xl font-bold text-center mb-6 text-gray-900 h-20 flex items-center justify-center"
  const desc_styling = "text-lg text-center text-gray-800 leading-relaxed"
  
  return (
    <div ref={ref} className="relative flex flex-col justify-center items-center w-full pb-50 px-10 pt-0 bg-gradient-to-br from-custom-pink via-white to-custom-orange overflow-hidden">
      <h1 className="text-7xl font-bold mb-16 text-center text-gray-900">Features</h1>
      <div className="flex gap-8 justify-center max-w-7xl">
        
        <div className={box_styling}>
          <h2 className={title_styling}>Video Detection</h2>
          <p className={desc_styling}>Real-time body language tracking powered by YOLOv11. Get instant feedback on your posture, gestures, and movement to maintain confident, engaging presence.
          </p>
        </div>
        
        <div className={box_styling}>
          <h2 className={title_styling}>Audio Detection & Live AI Helper</h2>
          <p className={desc_styling}>Speech-to-text transcription with AI coaching. Stay on track with your script and receive real-time alerts when you miss key points.
          </p>
        </div>
        
        <div className={box_styling}>
          <h2 className={title_styling}>EEG Brain Monitoring</h2>
          <p className={desc_styling}>Track your stress levels and emotional state using EEG signals from the Muse S headset. Monitor Alpha, Beta, Theta, and Delta waves for real-time mental wellness insights.
          </p>
        </div>
      
      </div>
    </div>
  );
});

export default AboutUs;
