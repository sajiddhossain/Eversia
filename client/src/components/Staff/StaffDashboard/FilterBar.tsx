import React from 'react';
import { motion } from 'framer-motion';
import type { Assignment } from './types';

interface FilterBarProps {
    assignments: Assignment[];
    availableTurns: string[];
    selectedTurn: string;
    setSelectedTurn: (turn: string) => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({ 
    assignments, 
    availableTurns, 
    selectedTurn, 
    setSelectedTurn 
}) => {
    if (assignments.length === 0 || availableTurns.length <= 1) return null;

    return (
        <div className="flex flex-wrap items-center gap-2 bg-white/[0.02] border border-white/5 p-1.5 rounded-2xl w-fit backdrop-blur-md">
            <button
                onClick={() => setSelectedTurn('ALL')}
                className={`relative px-4 md:px-5 py-2 rounded-xl text-xs font-display font-semibold transition-colors duration-300 ${
                    selectedTurn === 'ALL' ? 'text-black' : 'text-white/40 hover:text-white'
                }`}
            >
                {selectedTurn === 'ALL' && (
                    <motion.div
                        layoutId="staff-filter-indicator"
                        className="absolute inset-0 rounded-xl bg-white shadow-lg"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                )}
                <span className="relative z-10">Panoramica</span>
            </button>
            {availableTurns.map(turnId => (
                <button
                    key={turnId}
                    onClick={() => setSelectedTurn(turnId)}
                    className={`relative px-4 md:px-5 py-2 rounded-xl text-xs font-display font-semibold transition-colors duration-300 ${
                        selectedTurn === turnId ? 'text-black' : 'text-white/40 hover:text-white'
                    }`}
                >
                    {selectedTurn === turnId && (
                        <motion.div
                            layoutId="staff-filter-indicator"
                            className="absolute inset-0 rounded-xl bg-brand-lime shadow-[0_0_15px_rgba(226,243,60,0.35)]"
                            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        />
                    )}
                    <span className="relative z-10">Turno {turnId}</span>
                </button>
            ))}
        </div>
    );
};
