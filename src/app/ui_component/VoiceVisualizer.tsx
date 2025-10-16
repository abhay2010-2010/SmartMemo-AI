import React, { useState, useEffect } from 'react';

interface VoiceVisualizerProps {
  isActive?: boolean;
  audioLevel?: number;
  color?: string;
}

const VoiceVisualizer: React.FC<VoiceVisualizerProps> = ({
  isActive = true,
  audioLevel = 0,
  color = '#3b82f6'
}) => {
  const [bars, setBars] = useState<number[]>(Array(12).fill(20));

  // Generate voice patterns with center emphasis
  const generatePattern = () => {
    if (!isActive) {
      setBars(Array(12).fill(5));
      return;
    }

    const newBars = bars.map((_, index) => {
      const baseLevel = audioLevel > 0 ? audioLevel : Math.random() * 60 + 10;
      const variation = Math.random() * 30;
      const smoothing = bars[index] * 0.7;
      
      // Center emphasis - bars in middle are taller
      const center = 5.5; // Center of 12 bars (0-11)
      const distanceFromCenter = Math.abs(index - center);
      const centerBoost = Math.max(0, 40 - (distanceFromCenter * 8));
      
      const finalHeight = (baseLevel + variation + smoothing + centerBoost) / 2;
      return Math.max(5, Math.min(90, finalHeight));
    });

    setBars(newBars);
  };

  useEffect(() => {
    const interval = setInterval(generatePattern, 200);
    return () => clearInterval(interval);
  }, [isActive, audioLevel, bars]);

  return (
    <div className="flex gap-1 items-center justify-center h-16 px-3 py-2 bg-white rounded-lg border">
      {bars.map((height, index) => (
        <div
          key={index}
          className="transition-all duration-300 ease-out rounded-t"
          style={{
            width: '6px',
            height: `${height}%`,
            backgroundColor: color,
            opacity: isActive ? 0.8 : 0.3,
          }}
        />
      ))}
    </div>
  );
};

// Demo component
const Demo: React.FC = () => {
  const [selectedColor, setSelectedColor] = useState('#3b82f6');

  const colors = [
    '#3b82f6', // Blue
    '#10b981', // Green  
    '#8b5cf6', // Purple
    '#ef4444', // Red
    '#f97316', // Orange
  ];

  return (
    <div className="max-w-md mx-auto p-6 space-y-4">
      <h2 className="text-xl font-bold text-gray-800 text-center">Voice Visualizer</h2>
      
      {/* Color Selector */}
      <div className="flex justify-center gap-2">
        {colors.map((color) => (
          <button
            key={color}
            onClick={() => setSelectedColor(color)}
            className={`w-6 h-6 rounded-full border-2 ${
              selectedColor === color ? 'border-gray-400' : 'border-gray-200'
            }`}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>

      {/* Visualizer */}
      <VoiceVisualizer
        isActive={true}
        color={selectedColor}
      />

      
    </div>
  );
};

export default Demo;