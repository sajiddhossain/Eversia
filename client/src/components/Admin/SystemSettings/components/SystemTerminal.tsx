import React, { useState, useRef, useEffect } from 'react';
import { ChevronRight, ShieldAlert } from 'lucide-react';

interface TerminalLine {
    type: 'input' | 'output' | 'error' | 'success';
    text: string;
}

interface SystemTerminalProps {
    history: TerminalLine[];
    onCommand: (input: string) => void;
    isDeveloper: boolean;
}

export const SystemTerminal: React.FC<SystemTerminalProps> = ({ history, onCommand, isDeveloper }) => {
    const [input, setInput] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [history]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || !isDeveloper) return;
        onCommand(input);
        setInput('');
    };

    if (!isDeveloper) {
        return (
            <div className="bg-black/40 border border-white/5 rounded-3xl p-8 flex flex-col items-center justify-center text-center space-y-4">
                <ShieldAlert className="w-12 h-12 text-white/10" />
                <p className="text-white/40 font-mono text-sm uppercase tracking-widest font-black">Access denied</p>
            </div>
        );
    }

    return (
        <div 
            className="bg-[#050505] border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden font-mono text-[11px] md:text-xs flex flex-col h-[500px]"
            onClick={() => inputRef.current?.focus()}
        >
            {/* Terminal Header */}
            <div className="bg-white/5 px-6 py-3 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50" />
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-2">eversia system console</span>
                </div>
                <div className="flex items-center gap-2 text-[9px] font-bold text-white/20 uppercase tracking-widest">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Live Connection
                </div>
            </div>

            {/* Terminal Output */}
            <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-6 space-y-2 custom-scrollbar"
            >
                {history.map((line, i) => (
                    <div key={i} className="flex gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
                        {line.type === 'input' && <ChevronRight className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" />}
                        <span className={`
                            ${line.type === 'input' ? 'text-white font-bold' : ''}
                            ${line.type === 'output' ? 'text-white/60' : ''}
                            ${line.type === 'error' ? 'text-red-400 font-bold bg-red-500/10 px-2 rounded' : ''}
                            ${line.type === 'success' ? 'text-emerald-400 font-bold' : ''}
                            break-words leading-relaxed
                        `}>
                            {line.text}
                        </span>
                    </div>
                ))}
            </div>

            {/* Terminal Input */}
            <form onSubmit={handleSubmit} className="p-6 bg-white/[0.02] border-t border-white/10">
                <div className="grid grid-cols-[auto,1fr] items-center gap-3">
                    <div className="flex items-center gap-2">
                        <span className="text-blue-400">root@eversia</span>
                        <span className="text-purple-400">~</span>
                        <span className="text-white/40">$</span>
                    </div>
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        autoFocus
                        className="bg-transparent border-none outline-none text-white w-full placeholder:text-white/10"
                        placeholder="Digitare un comando..."
                    />
                </div>
            </form>
        </div>
    );
};
