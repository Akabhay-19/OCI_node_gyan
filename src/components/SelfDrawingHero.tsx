import React, { useEffect, useState } from 'react';

export const SelfDrawingHero: React.FC = () => {
    const [pathLength, setPathLength] = useState(0);

    // Dynamic paths for a "neural network" look
    // We'll use a few fixed paths for reliability but animate them
    const paths = [
        "M10,50 Q100,10 200,50 T400,50 T600,50 T800,50",
        "M0,100 C150,150 200,50 400,100 S700,0 800,100",
        "M50,0 Q50,150 100,300 T200,500",
        "M750,0 Q750,200 600,300 T500,600",
        "M300,0 Q350,200 400,300 T500,400"
    ];

    return (
        <div className="absolute inset-0 z-0 opacity-40 pointer-events-none overflow-hidden">
            <style>
                {`
                    @keyframes draw {
                        0% { stroke-dashoffset: 2000; }
                        100% { stroke-dashoffset: 0; }
                    }
                    .animate-draw {
                        stroke-dasharray: 2000;
                        stroke-dashoffset: 2000;
                        animation: draw 4s ease-out forwards;
                    }
                `}
            </style>
            <svg
                className="w-full h-full"
                viewBox="0 0 800 600"
                preserveAspectRatio="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <defs>
                    <linearGradient id="line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#00f3ff" stopOpacity="0" />
                        <stop offset="50%" stopColor="#00f3ff" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#bc13fe" stopOpacity="0" />
                    </linearGradient>
                </defs>

                {paths.map((d, i) => (
                    <g key={i}>
                        {/* Glow effect duplicate */}
                        <path
                            d={d}
                            fill="none"
                            stroke="#00f3ff"
                            strokeWidth="2"
                            className="animate-draw blur-[4px]"
                            style={{
                                animationDelay: `${i * 0.5}s`,
                                strokeOpacity: 0.3
                            }}
                        />
                        {/* Main line */}
                        <path
                            d={d}
                            fill="none"
                            stroke="url(#line-gradient)"
                            strokeWidth="1"
                            className="animate-draw"
                            style={{
                                animationDelay: `${i * 0.5}s`
                            }}
                        />
                        {/* Moving particles (circles) along the path can be complex with pure CSS/SVG without SMIL or JS frame loops.
                            We'll stick to the drawing effect for the "line" feel.
                         */}
                    </g>
                ))}

                {/* Random connecting nodes */}
                <circle cx="200" cy="50" r="3" fill="#00f3ff" className="animate-pulse" style={{ animationDelay: '2s' }} />
                <circle cx="400" cy="100" r="3" fill="#bc13fe" className="animate-pulse" style={{ animationDelay: '3s' }} />
                <circle cx="100" cy="300" r="3" fill="#00f3ff" className="animate-pulse" style={{ animationDelay: '1.5s' }} />
            </svg>
        </div>
    );
};
