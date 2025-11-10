import React, { forwardRef } from 'react';
import GetStartedButton from '../components/GetStartedButton'

const ProductDescription = forwardRef((props, ref) =>{
  return (
    <div ref={ref} className="flex flex-col justify-center items-center w-full gap-8">
      <h1 className="text-5xl text-center w-4/10">Upgrade your <span className="font-bold">Public Speaking</span> Skills</h1>
      <GetStartedButton>Try Orator Now</GetStartedButton>
     <p className="text-xl text-center"> 
        Using the Muse S headband, video tracking, and speech patterns, Orator helps you succeed in delivering an explorative and authentic speech while also guiding you along the process.
        Through EEG data, Alpha, Beta, Theta, and Delta waves can be recorded from the four nodes located near the temple and the forehead. The activation of neurons are picked up 
        using EEG and the data is transmitted through to our software, which will then help you understand stress levels and emotional wellbeing as you speak. Using video tracking software will
        observe the movements of the presenter and pop an alert to help you improve engagement with your audience! Gestures that might distract from the presentation of the product will be flagged
        and the user will be reminded of their behaviour. Not only that, using GeminiApi, we will help you emphasize the main ideas of your presentation in real time! A simple highlight will let us know 
        where your main points will be, and as they are coming up or if the user forgets, a simple alert will help push them back on the right track.
      </p>
    </div>
  );
});

export default ProductDescription;
