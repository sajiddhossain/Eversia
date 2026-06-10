import React, { createContext, useContext, useState } from 'react';
import type { Assembly } from '../types';

interface AssemblyContextType {
    selectedAssembly: Assembly | null;
    setSelectedAssembly: (assembly: Assembly | null) => void;
}

const AssemblyContext = createContext<AssemblyContextType | undefined>(undefined);

export const AssemblyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [selectedAssembly, setSelectedAssembly] = useState<Assembly | null>(null);

    // Persistence could be added here (localStorage) if needed

    return (
        <AssemblyContext.Provider value={{ selectedAssembly, setSelectedAssembly }}>
            {children}
        </AssemblyContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAssembly = () => {
    const context = useContext(AssemblyContext);
    if (!context) {
        throw new Error('useAssembly must be used within an AssemblyProvider');
    }
    return context;
};
