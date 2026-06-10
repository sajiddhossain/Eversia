import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { marked } from "marked";
import { sanitizeHtml, escapeHtml } from "./security";


// ═══════════════════════════════════════════════
// 📦  TYPES
// ═══════════════════════════════════════════════

interface EmailPayload {
    recipients: string[];
    subject: string;
    body: string;
    isHtml?: boolean;
    useBcc?: boolean;
}

interface SendOptions extends EmailPayload {
    /** Callback per progress tracking. Chiamata dopo ogni batch inviato. */
    onProgress?: (progress: EmailProgress) => void;
}

export interface EmailProgress {
    /** Batch corrente (1-indexed) */
    currentBatch: number;
    /** Totale batch da inviare */
    totalBatches: number;
    /** Email inviate finora */
    sentSoFar: number;
    /** Totale email da inviare */
    totalRecipients: number;
    /** Stato corrente */
    status: 'sending' | 'retrying' | 'done' | 'error';
    /** Messaggio leggibile */
    message: string;
}

export interface EmailResult {
    success: boolean;
    partialSuccess?: boolean;
    error?: string;
    data?: {
        sent: number;
        failed: number;
        totalBatches: number;
        batchResults: Array<{
            batchIndex: number;
            count: number;
            status: string;
            error?: string;
        }>;
        invalidEmailsSkipped?: number;
        elapsedMs?: number;
    };
    quota?: {
        remainingToday: number;
    };
}

// ═══════════════════════════════════════════════
// ⚙️  CONFIGURAZIONE
// ═══════════════════════════════════════════════

/** Massimo destinatari per singola richiesta al bridge */
const CLIENT_BATCH_SIZE = 50;

/** Numero massimo di tentativi per singola richiesta */
const MAX_RETRIES = 3;

/** Timeout per singola richiesta (ms) */
const REQUEST_TIMEOUT_MS = 30_000;

/** Base delay per exponential backoff (ms) */
const BASE_RETRY_DELAY_MS = 1000;


// ═══════════════════════════════════════════════
// 🔐  HMAC UTILS
// ═══════════════════════════════════════════════

/**
 * Genera firma HMAC-SHA256 usando Web Crypto API.
 * Usata per autenticazione sicura con il bridge GAS.
 */
async function generateHmac(message: string, secret: string): Promise<string> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );
    const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
    return btoa(String.fromCharCode(...new Uint8Array(signature)));
}


// ═══════════════════════════════════════════════
// 🔄  FETCH CON RETRY
// ═══════════════════════════════════════════════

/**
 * Esegue una fetch con:
 *  - Timeout tramite AbortController
 *  - Retry con exponential backoff
 *  - Parsing JSON della risposta (non più opaque)
 */
async function fetchWithRetry(
    url: string,
    options: RequestInit,
    retries = MAX_RETRIES
): Promise<EmailResult> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
        
        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
                redirect: "follow", // IMPORTANTE: segue il redirect di GAS per ottenere JSON reale
            });
            
            clearTimeout(timeoutId);
            
            // Tenta di parsare la risposta JSON
            const text = await response.text();
            
            try {
                const result = JSON.parse(text) as EmailResult;
                return result;
            } catch {
                // GAS potrebbe restituire HTML di errore
                if (text.includes("<!DOCTYPE") || text.includes("<html")) {
                    throw new Error("Il bridge ha restituito HTML invece di JSON. Verifica che il deployment sia configurato correttamente.");
                }
                throw new Error(`Risposta non-JSON dal bridge: ${text.substring(0, 100)}`);
            }
            
        } catch (error: unknown) {
            const err = error as Error & { message?: string };
            clearTimeout(timeoutId);
            lastError = err;
            
            // Non ritentare su errori di autenticazione o validazione (sono definitivi)
            if (err.message?.includes("Non autorizzato") || 
                err.message?.includes("Rate limit") ||
                err.message?.includes("Nessun destinatario")) {
                throw error;
            }
            
            // Errore di rete/timeout — ritenta con backoff
            if (attempt < retries) {
                const delay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
                console.warn(`[EmailBridge] Tentativo ${attempt}/${retries} fallito, retry tra ${delay}ms:`, err.message);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    
    throw lastError || new Error("Tutti i tentativi di invio sono falliti");
}


// ═══════════════════════════════════════════════
// 📬  INVIO EMAIL PRINCIPALE
// ═══════════════════════════════════════════════

/**
 * Recupera configurazione bridge da Firestore.
 * @returns {{ bridgeUrl: string, apiKey: string, hmacSecret?: string }}
 */
async function getBridgeConfig() {
    const configSnap = await getDoc(doc(db, "config", "main"));
    const secretSnap = await getDoc(doc(db, "config_secrets", "main"));
    
    if (!configSnap.exists()) {
        throw new Error("Configurazione di sistema non trovata");
    }
    
    const config = configSnap.data();
    const secrets = secretSnap.exists() ? secretSnap.data() : {};
    
    const bridgeUrl = config.email_bridge_url;
    const apiKey = secrets.email_api_key;
    
    if (!bridgeUrl || !apiKey) {
        throw new Error("Bridge Email non configurato. Vai in Impostazioni di Sistema.");
    }
    
    return {
        bridgeUrl,
        apiKey,
        hmacSecret: secrets.email_hmac_secret || "",
    };
}

/**
 * Costruisce il body della richiesta con autenticazione HMAC o API key.
 */
async function buildAuthenticatedPayload(
    payload: EmailPayload,
    apiKey: string,
    hmacSecret: string
): Promise<Record<string, unknown>> {
    const base: Record<string, unknown> = { ...payload };
    
    if (hmacSecret) {
        // Autenticazione HMAC-SHA256
        const timestamp = String(Date.now());
        const sortedRecipients = [...payload.recipients].sort().join(',');
        const isHtmlStr = payload.isHtml ? "true" : "false";
        const useBccStr = payload.useBcc !== false ? "true" : "false";
        const message = [
            timestamp,
            payload.subject || "",
            sortedRecipients,
            payload.body || "",
            isHtmlStr,
            useBccStr
        ].join(':');
        
        const hmac = await generateHmac(message, hmacSecret);
        
        base.hmac = hmac;
        base.timestamp = timestamp;
    } else {
        // Fallback: API key semplice
        base.apiKey = apiKey;
    }
    
    return base;
}

/**
 * Invia email tramite il bridge Google Apps Script configurato nel sistema.
 * 
 * ═══════════════════════════════════════════════════════════
 * v2: Con batching, retry, progress tracking e HMAC auth.
 * ═══════════════════════════════════════════════════════════
 * 
 * Se il numero di destinatari supera CLIENT_BATCH_SIZE (50), l'invio
 * viene diviso in batch sequenziali. Ogni batch viene inviato con
 * retry automatico e exponential backoff.
 * 
 * @param options - Payload email + callback opzionale di progress
 * @returns Risultato aggregato di tutti i batch
 */
export const sendEmailViaBridge = async (options: SendOptions): Promise<EmailResult> => {
    const { onProgress, ...payload } = options;
    
    try {
        // ─── Config ───
        const { bridgeUrl, apiKey, hmacSecret } = await getBridgeConfig();
        
        // ─── Batch splitting lato client ───
        const allRecipients = payload.recipients;
        const batches: string[][] = [];
        
        for (let i = 0; i < allRecipients.length; i += CLIENT_BATCH_SIZE) {
            batches.push(allRecipients.slice(i, i + CLIENT_BATCH_SIZE));
        }
        
        const totalBatches = batches.length;
        let totalSent = 0;
        let totalFailed = 0;
        const allBatchResults: Array<{ batchIndex: number; count: number; status: string; error?: string }> = [];
        const failedBatches: number[] = [];
        let lastQuota: number | undefined;
        
        // ─── Invio sequenziale dei batch ───
        for (let i = 0; i < batches.length; i++) {
            const batchRecipients = batches[i];
            const batchPayload: EmailPayload = {
                ...payload,
                recipients: batchRecipients,
            };
            
            // Progress: inizio batch
            onProgress?.({
                currentBatch: i + 1,
                totalBatches,
                sentSoFar: totalSent,
                totalRecipients: allRecipients.length,
                status: 'sending',
                message: `Invio batch ${i + 1}/${totalBatches}... (${batchRecipients.length} destinatari)`,
            });
            
            try {
                const authPayload = await buildAuthenticatedPayload(
                    batchPayload, apiKey, hmacSecret
                );
                
                const result = await fetchWithRetry(bridgeUrl, {
                    method: "POST",
                    headers: { "Content-Type": "text/plain" },
                    body: JSON.stringify(authPayload),
                });
                
                if (result.success || result.partialSuccess) {
                    totalSent += result.data?.sent || batchRecipients.length;
                    totalFailed += result.data?.failed || 0;
                } else {
                    totalFailed += batchRecipients.length;
                    failedBatches.push(i + 1);
                }
                
                if (result.data?.batchResults) {
                    allBatchResults.push(...result.data.batchResults);
                }
                
                if (result.quota) {
                    lastQuota = result.quota.remainingToday;
                }
                
            } catch (batchError: unknown) {
                const err = batchError as Error & { message?: string };
                totalFailed += batchRecipients.length;
                failedBatches.push(i + 1);
                
                console.error(`[EmailBridge] Batch ${i + 1} fallito definitivamente:`, err.message);
                
                // Se è un errore di autenticazione o rate limit, ferma tutto
                if (err.message?.includes("Non autorizzato") ||
                    err.message?.includes("Rate limit")) {
                    onProgress?.({
                        currentBatch: i + 1,
                        totalBatches,
                        sentSoFar: totalSent,
                        totalRecipients: allRecipients.length,
                        status: 'error',
                        message: err.message,
                    });
                    
                    return {
                        success: false,
                        error: err.message,
                        data: {
                            sent: totalSent,
                            failed: totalFailed,
                            totalBatches,
                            batchResults: allBatchResults,
                        },
                    };
                }
            }
        }
        
        // ─── Progress: completato ───
        const success = totalFailed === 0;
        const partialSuccess = totalSent > 0 && totalFailed > 0;
        
        onProgress?.({
            currentBatch: totalBatches,
            totalBatches,
            sentSoFar: totalSent,
            totalRecipients: allRecipients.length,
            status: success ? 'done' : 'error',
            message: success 
                ? `Tutte le ${totalSent} email inviate con successo!`
                : partialSuccess 
                    ? `${totalSent} email inviate, ${totalFailed} fallite (batch ${failedBatches.join(', ')})`
                    : `Invio fallito: ${totalFailed} email non inviate`,
        });
        
        return {
            success,
            partialSuccess,
            error: !success 
                ? `${totalFailed} email non inviate (batch falliti: ${failedBatches.join(', ')})` 
                : undefined,
            data: {
                sent: totalSent,
                failed: totalFailed,
                totalBatches,
                batchResults: allBatchResults,
            },
            quota: lastQuota !== undefined ? { remainingToday: lastQuota } : undefined,
        };
        
    } catch (error: unknown) {
        const err = error as Error & { message?: string };
        console.error("[EmailBridge] Errore critico:", err);
        
        onProgress?.({
            currentBatch: 0,
            totalBatches: 0,
            sentSoFar: 0,
            totalRecipients: options.recipients.length,
            status: 'error',
            message: err.message || String(error),
        });
        
        return { success: false, error: err.message || String(error) };
    }
};


// ═══════════════════════════════════════════════
// 🏥  HEALTH CHECK
// ═══════════════════════════════════════════════

/**
 * Controlla lo stato del bridge e la quota email residua.
 * Utile per la UI di diagnostica nelle impostazioni admin.
 */
export const checkBridgeHealth = async (): Promise<{
    online: boolean;
    version?: string;
    quota?: { remainingToday: number; batchSize: number; estimatedMaxRecipients: number };
    error?: string;
}> => {
    try {
        const configSnap = await getDoc(doc(db, "config", "main"));
        if (!configSnap.exists()) {
            return { online: false, error: "Configurazione di sistema non trovata" };
        }
        
        const bridgeUrl = configSnap.data().email_bridge_url;
        if (!bridgeUrl) {
            return { online: false, error: "URL del bridge non configurato" };
        }
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10_000);
        
        const response = await fetch(bridgeUrl, {
            signal: controller.signal,
            redirect: "follow",
        });
        
        clearTimeout(timeoutId);
        
        const data = await response.json();
        
        return {
            online: data.status === "online",
            version: data.version,
            quota: data.quota,
        };
    } catch (error: unknown) {
        const err = error as Error & { message?: string };
        return { 
            online: false, 
            error: err.name === "AbortError" 
                ? "Il bridge non risponde (timeout 10s)" 
                : err.message || String(error)
        };
    }
};


// ═══════════════════════════════════════════════
// 📝  EMAIL TEMPLATES
// ═══════════════════════════════════════════════

/**
 * Template email "Iscrizioni Aperte"
 */
export const getEnrollmentOpenTemplate = (assemblyName: string, joinLink: string) => {
    const escapedName = escapeHtml(assemblyName);
    const escapedLink = escapeHtml(joinLink);
    return {
        subject: `📣 Iscrizioni Aperte: ${assemblyName}`,
        body: `
            <div style="background-color: #f8fafc; padding: 40px 20px; width: 100%; box-sizing: border-box; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b;">
                <div style="max-width: 600px; margin: 0 auto; padding: 40px; border: 1px solid #e2e8f0; border-radius: 32px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
                    <div style="text-align: center; margin-bottom: 32px;">
                        <span style="display: inline-block; background-color: #E2F33C; color: #000000; padding: 10px 20px; border-radius: 14px; font-weight: 900; letter-spacing: 0.15em; font-size: 11px; text-transform: uppercase; border: 1px solid #d4e335;">eversia</span>
                    </div>
                    
                    <h1 style="font-weight: 900; font-size: 28px; margin-bottom: 24px; line-height: 1.2; color: #0f172a; letter-spacing: -0.02em;">Ciao! 👋</h1>
                    <p style="color: #475569; font-size: 16px; line-height: 1.6; font-weight: 500; margin-bottom: 16px;">
                        Le iscrizioni per l'assemblea <strong style="color: #0f172a; font-weight: 800;">${escapedName}</strong> sono ora ufficialmente aperte.
                    </p>
                    <p style="color: #475569; font-size: 16px; line-height: 1.6; font-weight: 500;">
                        Scegli ora le tue attività preferite cliccando qui sotto:
                    </p>
                    
                    <div style="text-align: center; margin: 48px 0;">
                        <a href="${escapedLink}" style="display: inline-block; background-color: #000000; color: #E2F33C; padding: 18px 40px; text-decoration: none; font-weight: 900; font-size: 13px; letter-spacing: 0.1em; border-radius: 16px; text-transform: uppercase;">Vai all'Iscrizione</a>
                    </div>
                    
                    <div style="background-color: #f1f5f9; border: 1px solid #e2e8f0; padding: 24px; border-radius: 20px; margin-top: 30px;">
                        <p style="font-size: 11px; color: #64748b; margin: 0; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px;">Link di Emergenza</p>
                        <p style="font-size: 13px; color: #475569; margin: 0; word-break: break-all; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;">
                            <a href="${escapedLink}" style="color: #0f172a; text-decoration: underline;">${escapedLink}</a>
                        </p>
                    </div>
                    
                    <div style="margin-top: 48px; padding-top: 24px; border-top: 1px solid #e2e8f0; text-align: center;">
                        <p style="font-size: 11px; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em;">eversia system</p>
                    </div>
                </div>
                <div style="text-align: center; margin-top: 24px;">
                    <p style="font-size: 10px; color: #94a3b8;">Ricevi questa email perché sei uno studente registrato alla piattaforma eversia.</p>
                </div>
            </div>
        `,
        isHtml: true,
    };
};

/**
 * Template generico per messaggi custom definiti dall'admin
 */
export const getCustomTemplate = (subject: string, title: string, messageBody: string) => {
    // V-014 FIX: Sanitizzazione dell'output Markdown → HTML con DOMPurify.
    // Senza questo, un admin compromesso potrebbe iniettare JavaScript
    // nelle email inviate a tutti gli studenti (Stored XSS vector).
    const formattedBody = sanitizeHtml(marked.parse(messageBody) as string);
    const escapedTitle = escapeHtml(title);

    return {
        subject: subject,
        body: `
            <div style="background-color: #f8fafc; padding: 40px 20px; width: 100%; box-sizing: border-box; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b;">
                <div style="max-width: 600px; margin: 0 auto; padding: 40px; border: 1px solid #e2e8f0; border-radius: 32px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
                    <div style="margin-bottom: 32px; text-align: center;">
                        <span style="display: inline-block; background-color: #E2F33C; color: #000000; padding: 10px 20px; border-radius: 14px; font-weight: 900; letter-spacing: 0.15em; font-size: 11px; text-transform: uppercase; border: 1px solid #d4e335;">${escapedTitle}</span>
                    </div>
                    
                    <div style="color: #334155; font-size: 16px; line-height: 1.7; font-weight: 500;">
                        ${formattedBody}
                    </div>
                    
                    <div style="margin-top: 48px; padding-top: 24px; border-top: 1px solid #e2e8f0; text-align: center;">
                        <p style="font-size: 11px; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em;">eversia</p>
                    </div>
                </div>
                <div style="text-align: center; margin-top: 24px;">
                    <p style="font-size: 10px; color: #94a3b8;">Comunicazione inviata dallo Staff di Gestione Assemblee.</p>
                </div>
            </div>
        `,
        isHtml: true,
    };
};
