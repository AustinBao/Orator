import { useEffect, useRef, useState } from 'react';

// Define the API URL based on the environment
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function Camera() {
    const videoRef = useRef<HTMLImageElement>(null);
    const [hasError, setHasError] = useState(false);

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
        <div className='w-full h-full bg-gray-800 flex justify-center items-center overflow-hidden'>
            {hasError ? (
                <div className="text-gray-400 text-center p-4">
                    <p className="text-lg mb-2">📹 Camera Not Available</p>
                    <p className="text-sm">Video feed is only available when running locally with a camera.</p>
                </div>
            ) : (
                <img 
                    ref={videoRef}
                    alt="Video feed"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                        console.log('Video feed not available (expected on production)');
                        setHasError(true);
                        if (e.currentTarget) {
                            e.currentTarget.src = '';
                        }
                    }}
                />
            )}
        </div>
    );
}