import React from 'react';

interface GestureTextboxProps {
  className?: string;
}

import { useEffect, useState } from 'react';

interface GestureData {
  hipsway?: number;
  pacing?: number;
  headtilt?: number;
  handtomouth?: number;
  toostill?: number;
  message?: string;
}

const GestureTextbox: React.FC<GestureTextboxProps> = ({ className = '' }) => {
  const [gestureData, setGestureData] = useState<GestureData>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGestureData = async () => {
      try {
        const response = await fetch('http://localhost:8000/gesture_data');
        if (!response.ok) {
          throw new Error('Failed to fetch gesture data');
        }
        const data = await response.json();
        setGestureData(data);
        setError(null);
      } catch (err) {
        setError('Error loading gesture analysis');
        console.error('Error fetching gesture data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    // Initial fetch
    fetchGestureData();
    
    // Set up polling every 2 seconds
    const intervalId = setInterval(fetchGestureData, 2000);
    
    return () => clearInterval(intervalId);
  }, []);

  // Helper function to get status text and color
  const getStatus = (value: number | undefined) => {
    if (value === undefined) return { text: 'N/A', color: 'text-gray-400' };
    return value === 1 
      ? { text: 'Detected', color: 'text-red-400' } 
      : { text: 'Normal', color: 'text-green-400' };
  };

  return (
    <div className={`bg-white/10 backdrop-blur-sm rounded-lg p-4 h-full overflow-y-auto ${className}`}>
      <h3 className="text-indigo-300 font-semibold mb-4">Gesture Analysis</h3>
      
      {isLoading ? (
        <div className="text-gray-300 text-sm">Loading gesture analysis...</div>
      ) : error ? (
        <div className="text-red-400 text-sm">{error}</div>
      ) : 'message' in gestureData ? (
        <div className="text-gray-300 text-sm">{gestureData.message}</div>
      ) : (
        <div className="space-y-3">
          <div>
            <span className="text-gray-300">Hip Sway: </span>
            <span className={getStatus(gestureData.hipsway).color}>
              {getStatus(gestureData.hipsway).text}
            </span>
          </div>
          <div>
            <span className="text-gray-300">Pacing: </span>
            <span className={getStatus(gestureData.pacing).color}>
              {getStatus(gestureData.pacing).text}
            </span>
          </div>
          <div>
            <span className="text-gray-300">Head Tilt: </span>
            <span className={getStatus(gestureData.headtilt).color}>
              {getStatus(gestureData.headtilt).text}
            </span>
          </div>
          <div>
            <span className="text-gray-300">Hand to Face: </span>
            <span className={getStatus(gestureData.handtomouth).color}>
              {getStatus(gestureData.handtomouth).text}
            </span>
          </div>
          <div>
            <span className="text-gray-300">Too Still: </span>
            <span className={getStatus(gestureData.toostill).color}>
              {getStatus(gestureData.toostill).text}
            </span>
          </div>
        </div>
      )}
      
      <div className="mt-4 pt-4 border-t border-white/10">
        <h4 className="text-indigo-200 text-sm font-medium mb-2">Tips:</h4>
        <ul className="text-gray-300 text-sm space-y-1">
          <li>• Keep your hands visible for better analysis</li>
          <li>• Avoid crossing your arms</li>
          <li>• Maintain good posture</li>
          <li>• Move naturally while speaking</li>
        </ul>
      </div>
    </div>
  );
};

export default GestureTextbox;
