import DOMPurify from 'dompurify';

// ─── V-013 FIX: Hook DOMPurify per sanitizzare attributi href pericolosi ───
// Previene XSS tramite javascript: URL scheme nei link.
// Eseguito una sola volta al caricamento del modulo.
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    // Sanitizzazione href: blocca javascript:, data:, vbscript: URL
    if (node.hasAttribute('href')) {
        const href = node.getAttribute('href') || '';
        const dangerousProtocols = /^\s*(javascript|data|vbscript)\s*:/i;
        if (dangerousProtocols.test(href)) {
            node.removeAttribute('href');
        }
    }
    // Forza rel="noopener noreferrer" su tutti i link con target
    if (node.hasAttribute('target')) {
        node.setAttribute('rel', 'noopener noreferrer');
    }
});

/**
 * Sanitizes an HTML string to prevent XSS attacks.
 * 
 * V-013 FIX: Aggiunto hook per bloccare javascript: URL e forzare
 * rel="noopener noreferrer" su link con target.
 * 
 * @param html The HTML string to sanitize.
 * @returns The sanitized HTML string.
 */
export const sanitizeHtml = (html: string): string => {
    return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: [
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'p', 'a', 'ul', 'ol',
            'nl', 'li', 'b', 'i', 'strong', 'em', 'strike', 'code', 'hr', 'br', 'div',
            'table', 'thead', 'caption', 'tbody', 'tr', 'th', 'td', 'pre', 'span'
        ],
        ALLOWED_ATTR: ['href', 'name', 'target', 'class', 'rel'],
        // Blocca protocolli non-standard (extra sicurezza oltre al hook)
        ALLOW_UNKNOWN_PROTOCOLS: false,
    }) as string;
};

/**
 * Masks an email address for privacy.
 * Example: "example@domain.com" -> "ex****@domain.com"
 * @param email The email address to mask.
 * @returns The masked email address.
 */
export const maskEmail = (email: string): string => {
    if (!email || !email.includes('@')) return email;
    const [local, domain] = email.split('@');
    
    // Support dot-separated names like name.surname for school emails
    if (local.includes('.')) {
        const parts = local.split('.');
        const maskWord = (word: string) => {
            if (word.length <= 2) return `${word}*`;
            if (word.length <= 4) return `${word.substring(0, 2)}**`;
            return `${word.substring(0, 2)}***${word.substring(word.length - 1)}`;
        };
        return `${parts.map(maskWord).join('.')}@${domain}`;
    }
    
    if (local.length <= 2) return `${local}***@${domain}`;
    if (local.length <= 4) return `${local.substring(0, 2)}**@${domain}`;
    return `${local.substring(0, 2)}***${local.substring(local.length - 1)}@${domain}`;
};

/**
 * Escapes HTML special characters to prevent HTML Injection.
 * @param text The plain text to escape.
 * @returns The escaped HTML safe string.
 */
export const escapeHtml = (text: string): string => {
    if (!text) return "";
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

