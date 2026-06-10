import React from 'react';

interface BrandNameProps {
    className?: string;
    isLogo?: boolean;
    isPlain?: boolean;
    variant?: 'hero' | 'navbar' | 'footer' | 'plain';
}

export const BrandName: React.FC<BrandNameProps> = ({ 
    className = '', 
    isLogo = false, 
    isPlain = false,
    variant
}) => {
    // Determine the variant based on legacy props or explicit variant prop
    let activeVariant: 'hero' | 'navbar' | 'footer' | 'plain' = 'plain';
    
    if (variant) {
        activeVariant = variant;
    } else if (isLogo) {
        activeVariant = 'hero';
    } else if (isPlain) {
        activeVariant = 'plain';
    }

    if (activeVariant === 'hero') {
        return (
            <span className={`brand-eversia px-6 pt-2 pb-4 ${className}`}>eversia</span>
        );
    }
    
    if (activeVariant === 'navbar') {
        return (
            <span className={`brand-eversia-clean pl-1 pr-2.5 pt-0.5 pb-0.5 ${className}`}>
                eversia
            </span>
        );
    }

    if (activeVariant === 'footer') {
        return (
            <span className={`brand-eversia-clean pl-0.5 pr-2 pt-0.5 pb-0.5 ${className}`}>
                eversia
            </span>
        );
    }
    
    return (
        <span className={`italic ${className}`}>eversia</span>
    );
};
