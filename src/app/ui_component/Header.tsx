'use client';

import React, { useEffect, useState } from 'react';
import { Mic, Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

interface HeaderProps {
    onNewRecording: () => void
    isNew: boolean
}
const Header: React.FC<HeaderProps> = ({ onNewRecording, isNew }) => {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    // console.log(isNew)

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    return (
        <header className="bg-gradient-to-r from-indigo-900 via-purple-800 to-pink-700 dark:from-zinc-900 dark:to-zinc-800 text-white px-6 py-4 shadow-md sticky top-0 z-50">
            <div className="max-w-7xl mx-auto flex items-center justify-between">

                <div className="flex items-center gap-3">
                    <Mic className="h-8 w-8 text-white animate-pulse" />
                    {/* <Image src="/logo.png" alt="SmartMemo Logo" width={40} height={40} className="rounded-full" /> */}
                    <h1 className="text-2xl font-bold tracking-wide">SmartMemo</h1>
                </div>


                <div className="flex items-center gap-4">
                    <span className="text-sm italic opacity-80 hidden sm:inline">
                        Voice to Intelligence
                    </span>
                    {isNew ?
                        <Button
                            onClick={onNewRecording}
                            className="bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 hover:from-pink-600 hover:via-red-600 hover:to-yellow-600 text-white px-2 ml-4 py-2 rounded-md shadow-lg transition duration-300"
                        >
                            <span className="sm:hidden">Create</span>
                            <span className="hidden sm:inline">➕ Create Memo</span>
                        </Button>

                        :
                        ""
                    }

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                        className="rounded-full transition-colors duration-200 -ml-2 hover:bg-gray-200 dark:hover:bg-gray-700"
                        aria-label="Toggle theme"
                    >
                        {theme === 'light' ? (
                            <Moon className="h-5 w-5 text-gray-800" />
                        ) : (
                            <Sun className="h-5 w-5 text-yellow-400" />
                        )}
                    </Button>

                </div>
            </div>
        </header>
    );
};

export default Header;
