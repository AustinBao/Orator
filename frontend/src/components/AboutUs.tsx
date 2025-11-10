import React, { forwardRef } from 'react';

const AboutUs = forwardRef((props, ref) => {
  
  const box_styling = "border p-4 rounded-md h-75 shadow-lg px-10"
  const title_styling = "text-2xl font-semibold text-center"
  const desc_styling = "text-md mt-5 text-center"
  return (
    <div ref={ref} className="flex flex-col justify-center items-center w-full">

      <h1 className="text-6xl font-medium:500 my-10 text-center w-4/10">Features</h1>
      <div className="text-lg flex space-x-4">
        
          <div className={box_styling}>
            <h2 className={title_styling}>Video Detection</h2>
            <p className={desc_styling}>Using YOLO API, certain gestures such as covering your face, pacing around, standing too still, and tilting your head down or to the side can be 
              detected. The system will let you know which gesture you are doing, so that you can stay confident and presentable.
            </p>
          </div>
          <div className={box_styling}>
            <h2 className={title_styling}>Audio Detection & Live AI Helper</h2>
            <p className={desc_styling}>With Gemini API, your live speech will be transcribed to follow along with your uploaded script. When you go too far off topic or miss an important
              idea, you will get a notification from the AI coach steering you in the right direction.
            </p>
          </div>
          
          <div className={box_styling}>
            <h2 className={title_styling}>Slideshow Presentation & Script Upload</h2>
            <p className={desc_styling}>When either uploading a script or simply typing it out yourself, simply click highlight and drag over text to show which points you would like emphasize. 
              Once you send the script, as you go along the presentation we will remind you of important ideas!
            </p>
          </div>
        
      </div>
    </div>
  );
});

export default AboutUs;
