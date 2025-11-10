import { useEffect, useRef } from 'react';

// Define the API URL based on the environment
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function Camera() {
    const videoRef = useRef<HTMLImageElement>(null);

    useEffect(() => {
        // Set the video feed source
        if (videoRef.current) {
            videoRef.current.src = `${API_URL}/video_feed`;
        }

        // Cleanup function to handle component unmount
        return () => {
            if (videoRef.current) {
                videoRef.current.src = '';
            }
        };
    }, []);

    return (
        <div className='w-[600px] h-[400px] bg-gray-400 flex justify-center items-center overflow-hidden'>
            <img 
                ref={videoRef}
                alt="Video feed"
                className="w-full h-full object-cover"
                onError={(e) => {
                    console.error('Error loading video feed');
                    if (e.currentTarget) {
                        e.currentTarget.src = '';
                    }
                }}
            />
        </div>
    );
}