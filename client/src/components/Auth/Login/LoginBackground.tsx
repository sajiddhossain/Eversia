import React from 'react';

const LoginBackground: React.FC = () => {
    return (
        <>
            {/* Ambient Animated Backgrounds */}
            <div className="absolute top-0 right-0 w-[800px] h-[800px] rounded-full blur-[150px] -translate-y-1/2 translate-x-1/3 pointer-events-none opacity-20 bg-primary/40 animate-pulse" />
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] rounded-full blur-[120px] translate-y-1/3 -translate-x-1/3 pointer-events-none opacity-10 bg-blue-500/30" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(226,243,60,0.03)_0%,transparent_70%)] pointer-events-none" />
        </>
    );
};

export default LoginBackground;
