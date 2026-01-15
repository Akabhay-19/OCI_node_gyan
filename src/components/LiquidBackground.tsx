import React from 'react';
import { motion } from 'framer-motion';

export const LiquidBackground: React.FC = () => {
    // Random movement variants
    const blobVariants: any = {
        animate: (i: number) => ({
            x: [0, Math.random() * 400 - 200, Math.random() * 400 - 200, 0],
            y: [0, Math.random() * 400 - 200, Math.random() * 400 - 200, 0],
            scale: [1, 1.2, 0.8, 1],
            transition: {
                duration: 20 + Math.random() * 10,
                repeat: Infinity,
                repeatType: "mirror",
                ease: "easeInOut",
                delay: i * 2,
            } as any, // Cast to any to avoid strict Easing type conflicts in some versions
        }),
    };

    return (
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
            {/* Dark base background */}
            <div className="absolute inset-0 bg-dark-bg/90"></div>

            {/* Liquid Blobs */}
            <div className="absolute inset-0 filter blur-[100px] opacity-40">
                {/* Cyan Blob */}
                <motion.div
                    className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-neon-cyan/30 rounded-full mix-blend-screen"
                    variants={blobVariants}
                    animate="animate"
                    custom={0}
                />

                {/* Purple Blob */}
                <motion.div
                    className="absolute top-[20%] right-[-10%] w-[45vw] h-[45vw] bg-neon-purple/30 rounded-full mix-blend-screen"
                    variants={blobVariants}
                    animate="animate"
                    custom={1}
                />

                {/* Pink/Blue Blob */}
                <motion.div
                    className="absolute bottom-[-20%] left-[20%] w-[60vw] h-[60vw] bg-blue-600/30 rounded-full mix-blend-screen"
                    variants={blobVariants}
                    animate="animate"
                    custom={2}
                />

                {/* Center Highlight Blob */}
                <motion.div
                    className="absolute top-[30%] left-[30%] w-[30vw] h-[30vw] bg-indigo-500/20 rounded-full mix-blend-plus-lighter"
                    variants={blobVariants}
                    animate="animate"
                    custom={3}
                />
            </div>

            {/* Grid Overlay for Cyberpunk feel */}
            <div
                className="absolute inset-0 z-10 opacity-[0.03]"
                style={{
                    backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)',
                    backgroundSize: '50px 50px'
                }}
            ></div>
        </div>
    );
};
