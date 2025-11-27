import { forwardRef } from 'react';

const ProductDescription = forwardRef<HTMLDivElement>((_props, ref) =>{
  return (
    <div ref={ref} className="flex flex-col justify-center items-center w-full gap-8">
      {/* Temporarily commented out for hero section */}
      {/* <h1 className="text-5xl text-center w-4/10">Upgrade your <span className="font-bold">Public Speaking</span> Skills</h1>
      <GetStartedButton>Try Orator Now</GetStartedButton>
     <p className="text-xl text-center"> 
        Orator helps you succeed in delivering an explorative and authentic speech using electropalatography, video tracking, and advanced speech-to-text. Using the Muse S headset, Alpha, Beta, Theta, and Delta waves are recorded from the four nodes located near the temple and the forehead. The brain's electrical signals are picked up using EEG and the data is transmitted to our software, which will then help you understand your stress levels and emotional wellbeing as you speak. A live video feed and computer vision model also observes your movements and sends alerts to help you engage more with your audience. If the system detects gestures that distract from the presentation or speech a gentle alert will appear. Additionally, Orator helps you emphasize the main ideas of your presentation in real time using an LLM powered coach. A simple highlight lets us know where your main points are, and an alert notifies you of upcoming or forgotten points.
      </p> */}
    </div>
  );
});

export default ProductDescription;
