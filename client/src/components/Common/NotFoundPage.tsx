import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Compass, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[calc(100vh-160px)] bg-[#09090b] text-white flex flex-col items-center justify-center px-4 relative overflow-hidden -mt-20 pt-20">
      {/* Decorative Brand Glow Orbs */}
      <div className="absolute top-1/2 left-1/3 w-[300px] h-[300px] md:w-[450px] md:h-[450px] rounded-full blur-[100px] md:blur-[150px] pointer-events-none opacity-20 -translate-x-1/2 -translate-y-1/2 bg-[#0082e6]" />
      <div className="absolute top-1/3 right-1/4 w-[250px] h-[250px] md:w-[400px] md:h-[400px] rounded-full blur-[100px] md:blur-[150px] pointer-events-none opacity-15 translate-x-1/2 bg-[#E2F33C]" />

      <div className="max-w-md w-full relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          className="glass-card rounded-[2rem] p-8 md:p-12 text-center flex flex-col items-center space-y-6 md:space-y-8"
        >
          {/* Animated Compass Icon Frame */}
          <motion.div
            whileHover={{ scale: 1.05, rotate: 15 }}
            className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center shadow-lg relative group overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-brand-lime/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <motion.div
              animate={{ 
                rotate: [0, 5, -5, 5, 0],
              }}
              transition={{
                repeat: Infinity,
                duration: 6,
                ease: "easeInOut"
              }}
            >
              <Compass className="w-8 h-8 md:w-10 md:h-10 text-brand-lime" />
            </motion.div>
          </motion.div>

          {/* Typography and Error Messages */}
          <div className="space-y-3">
            <h1 className="font-display font-black text-7xl md:text-8xl tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-[#0082e6] to-[#E2F33C] select-none">
              404
            </h1>
            <h2 className="font-display font-bold text-xl md:text-2xl tracking-tight text-white italic">
              Pagina non trovata
            </h2>
            <p className="text-xs md:text-sm text-white/50 font-medium leading-relaxed max-w-[280px] md:max-w-xs mx-auto">
              Il link a cui stai tentando di accedere non esiste o non disponi delle autorizzazioni necessarie per visualizzarlo.
            </p>
          </div>

          {/* Interactive Navigation Control Button */}
          <div className="w-full pt-2">
            <motion.button
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/')}
              className="w-full py-3.5 bg-white text-black hover:bg-neutral-100 rounded-xl text-xs font-semibold tracking-wide transition-all flex items-center justify-center gap-2 shadow-lg relative overflow-hidden group btn-press"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
              Torna alla Home
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
