'use client';

import React from 'react';
import { Mic } from 'lucide-react';

const Footer: React.FC = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="w-full bg-gradient-to-r from-indigo-700 via-purple-500 to-pink-600 border-t border-white/10 text-white text-sm px-4 py-2 fixed bottom-0 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        <div className="flex items-center gap-2 text-white/90">
          <Mic className="h-4 w-4 text-pink-400" />
          <span className="font-medium">SmartMemo</span>
        </div>

        
        <p className="text-xs text-gray-300 hidden sm:block">
          Speak your thoughts. Let AI write them.
        </p>

        
        <p className="text-xs text-gray-400">&copy; {year}</p>
      </div>
    </footer>
  );
};

export default Footer;
