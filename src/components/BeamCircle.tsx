
import React from "react";
import { motion } from "framer-motion";
import { cn } from "../lib/utils";

export interface Orbit {
    id: number;
    radiusFactor: number; // 0 to 1 (relative to size)
    speed: number; // seconds per rotation
    icon: React.ReactNode;
    iconSize: number;
    orbitColor?: string; // e.g. "rgba(0, 150, 255, 0.3)"
    orbitThickness?: number;
}

interface BeamCircleProps {
    size?: number;
    centerSize?: number;
    centerIcon?: React.ReactNode;
    orbits?: Orbit[];
    className?: string;
}

export const BeamCircle: React.FC<BeamCircleProps> = ({
    size = 400,
    centerSize = 80,
    centerIcon,
    orbits = [],
    className,
}) => {
    return (
        <div
            className={cn("relative flex items-center justify-center", className)}
            style={{ width: size, height: size }}
        >
            {/* Center Circle */}
            <div
                className="absolute z-10 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                style={{ width: centerSize, height: centerSize }}
            >
                {centerIcon}
            </div>

            {/* Orbits */}
            {orbits.map((orbit) => {
                const radius = size * orbit.radiusFactor;
                const orbitSize = radius * 2;

                return (
                    <div
                        key={orbit.id}
                        className="absolute flex items-center justify-center rounded-full pointer-events-none"
                        style={{
                            width: orbitSize,
                            height: orbitSize,
                            border: `${orbit.orbitThickness || 1}px solid ${orbit.orbitColor || "rgba(255, 255, 255, 0.1)"
                                }`,
                        }}
                    >
                        {/* Animated Orbitor */}
                        <motion.div
                            className="absolute w-full h-full"
                            animate={{ rotate: 360 }}
                            transition={{
                                duration: orbit.speed,
                                repeat: Infinity,
                                ease: "linear",
                            }}
                        >
                            <div
                                className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center rounded-full bg-black border border-white/10 shadow-sm transition-transform hover:scale-110"
                                style={{
                                    width: orbit.iconSize + 16, // Padding around icon
                                    height: orbit.iconSize + 16,
                                }}
                            >
                                {orbit.icon}
                            </div>
                        </motion.div>
                    </div>
                );
            })}

            {/* Background Glow effects */}
            <div className="absolute inset-0 bg-blue-500/5 rounded-full blur-3xl -z-10" />
        </div>
    );
};
