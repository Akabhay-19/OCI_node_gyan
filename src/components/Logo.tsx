import React from 'react';

interface LogoProps {
    className?: string;
    showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ className = "h-12", showText = true }) => {
    return (
        <div className={`flex items-center gap-3 select-none ${className}`}>
            <div className="relative group">
                {/* Glow Effect */}
                <div className="absolute inset-0 bg-neon-cyan/50 blur-[20px] rounded-full opacity-50 group-hover:opacity-80 transition-opacity duration-500 animate-pulse-slow"></div>

                {/* Logo SVG */}
                <svg
                    viewBox="0 0 100 100"
                    className="w-full h-full relative z-10 drop-shadow-[0_0_10px_rgba(0,243,255,0.5)]"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    {/* Hexagon Base */}
                    <path
                        d="M50 5 L93.3 30 V80 L50 105 L6.7 80 V30 L50 5 Z"
                        stroke="url(#gradient-cyan)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="opacity-30"
                    />

                    {/* Inner G Shape - Circuit Style */}
                    <path
                        d="M65 35 H50 V20 M35 30 A 25 25 0 1 0 75 65"
                        stroke="url(#gradient-main)"
                        strokeWidth="8"
                        strokeLinecap="round"
                        className="animate-draw-path"
                    />

                    {/* Circuit Dots */}
                    <circle cx="50" cy="20" r="4" fill="#00f3ff" className="animate-ping" style={{ animationDuration: '3s' }} />
                    <circle cx="75" cy="65" r="4" fill="#bc13fe" className="animate-ping" style={{ animationDuration: '3s', animationDelay: '1.5s' }} />

                    <defs>
                        <linearGradient id="gradient-cyan" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#00f3ff" />
                            <stop offset="1" stopColor="#0066ff" />
                        </linearGradient>
                        <linearGradient id="gradient-main" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#00f3ff" />
                            <stop offset="1" stopColor="#bc13fe" />
                        </linearGradient>
                    </defs>
                </svg>
            </div>

            {showText && (
                <div className="flex flex-col justify-center">
                    <h1 className="text-3xl font-display font-bold tracking-wider relative">
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-cyan-100 to-white">GYAN</span>
                        <span className="text-neon-cyan drop-shadow-[0_0_5px_rgba(0,243,255,0.8)]">.AI</span>
                    </h1>
                    <div className="h-[2px] w-full bg-gradient-to-r from-neon-cyan to-transparent rounded-full mt-[-2px]"></div>
                </div>
            )}
        </div>
    );
};
