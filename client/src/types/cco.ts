// V-010 FIX: Convertito da `class` a `interface`.
// Una class crea overhead runtime (costruttore, prototype chain) per un semplice tipo dato.
// Un interface viene eliminato in fase di compilazione TypeScript (zero-cost abstraction).
export interface DiagnosticLog {
    timestamp: string;
    type: 'INFO' | 'WARN' | 'SUCCESS' | 'ERROR';
    message: string;
}
