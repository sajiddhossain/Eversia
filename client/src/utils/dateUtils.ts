/**
 * Utility for converting and handling dates in DD-MM-YYYY format
 */

export const formatDateToIT = (dateStr: string): string => {
    if (!dateStr) return "";

    // If it's already in DD-MM-YYYY, return as is
    if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) return dateStr;

    // If it's in YYYY-MM-DD (from standard HTML date input)
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [y, m, d] = dateStr.split("-");
        return `${d}-${m}-${y}`;
    }

    // If it's a full ISO string (rare in our simple date fields, but safe)
    if (dateStr.includes('T')) {
        const datePart = dateStr.split('T')[0];
        if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
            const [y, m, d] = datePart.split("-");
            return `${d}-${m}-${y}`;
        }
    }

    return dateStr;
};

export const formatDateToISO = (dateStr: string): string => {
    if (!dateStr) return "";

    // If already in YYYY-MM-DD, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;

    // If in DD-MM-YYYY
    if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
        const [d, m, y] = dateStr.split("-");
        return `${y}-${m}-${d}`;
    }

    return dateStr;
};

export const getTodayIT = (): string => {
    const today = new Date();
    const d = String(today.getDate()).padStart(2, '0');
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const y = today.getFullYear();
    return `${d}-${m}-${y}`;
};
