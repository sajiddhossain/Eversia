/**
 * 📧 Google Apps Script — Email Bridge v2 per eversia
 * 
 * ═══════════════════════════════════════════════════════════════════
 *  Miglioramenti rispetto a v1:
 *  ✅ Batching automatico (chunk da 50 destinatari)
 *  ✅ BCC reale — i destinatari non vedono gli indirizzi degli altri
 *  ✅ Validazione input + whitelist domini scolastici
 *  ✅ Rate limiting (max 10 invii / minuto per sessione)
 *  ✅ Quota tracking con getRemainingDailyQuota()
 *  ✅ HMAC-SHA256 con timestamp (+ fallback API key semplice)
 *  ✅ Logging strutturato (console + opzionale Google Sheet)
 *  ✅ doGet() per health check e status quota
 *  ✅ Risposta JSON strutturata con dettagli per batch
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Istruzioni per il deploy:
 * 1. Vai su https://script.google.com/ con un account @liceoagnesi.edu.it
 * 2. Crea un nuovo progetto chiamato "eversia Email Bridge v2"
 * 3. Incolla questo codice nell'editor
 * 4. Clicca su "Esegui il deployment" -> "Nuovo deployment" -> "App Web"
 * 5. In "Chi può accedere", seleziona "Chiunque"
 *    (il controllo viene fatto tramite HMAC/API_KEY)
 * 6. Copia l'URL dell'App Web e inseriscilo nelle impostazioni di eversia
 * 
 * Configurazione opzionale:
 * - Imposta LOG_SHEET_ID con l'ID di un Google Sheet per logging persistente
 * - Cambia BATCH_SIZE se necessario (default: 50, max sicuro: 80)
 */

// ═══════════════════════════════════════════════
// ⚙️  CONFIGURAZIONE
// ═══════════════════════════════════════════════

/**
 * Chiave API semplice — usata come fallback se HMAC non è configurato.
 * ⚠️ IMPORTANTE: Configura questo valore in GAS > Impostazioni progetto > Proprietà script.
 *    Aggiungi una proprietà chiamata "API_KEY" con il valore segreto desiderato.
 */
const API_KEY = PropertiesService.getScriptProperties().getProperty('API_KEY');

/**
 * Secret per HMAC-SHA256 — deve corrispondere a quello in Firestore config_secrets.
 * ⚠️ IMPORTANTE: Configura questo valore in GAS > Impostazioni progetto > Proprietà script.
 *    Aggiungi una proprietà chiamata "HMAC_SECRET". Lascia non impostato per disabilitare HMAC.
 */
const HMAC_SECRET = PropertiesService.getScriptProperties().getProperty('HMAC_SECRET') || "";

/** Numero massimo di destinatari per singola chiamata a MailApp.sendEmail() */
const BATCH_SIZE = 50;

/** Numero massimo di invii consentiti per minuto (rate limiting) */
const MAX_SENDS_PER_MINUTE = 10;

/** ID di un Google Sheet per logging persistente (lascia vuoto per disabilitare) */
const LOG_SHEET_ID = "";

/** Domini email consentiti */
const ALLOWED_DOMAINS = ["liceoagnesi.edu.it", "liceoagnesi.gov.it"];

/** Nome mittente mostrato nelle email */
const SENDER_NAME = "eversia";


// ═══════════════════════════════════════════════
// 🔐  AUTENTICAZIONE
// ═══════════════════════════════════════════════

/**
 * Verifica l'autenticazione della richiesta.
 * Supporta due metodi:
 *  1. HMAC-SHA256 con timestamp (preferito, previene replay attacks)
 *  2. API Key semplice (fallback per retrocompatibilità)
 * 
 * @param {object} data - Il payload della richiesta
 * @returns {{ valid: boolean, method: string, error?: string }}
 */
function verifyAuth(data) {
  // Metodo 1: HMAC-SHA256
  if (HMAC_SECRET && HMAC_SECRET.trim() !== "") {
    if (!data.hmac || !data.timestamp) {
      return { valid: false, method: "HMAC", error: "Non autorizzato — HMAC e timestamp richiesti quando HMAC è abilitato" };
    }

    const now = Date.now();
    const requestTime = parseInt(data.timestamp, 10);
    
    // Valida timestamp contro NaN
    if (isNaN(requestTime)) {
      return { valid: false, method: "HMAC", error: "Timestamp non valido (NaN)" };
    }
    
    // Rifiuta richieste con timestamp > 5 minuti di scarto
    if (Math.abs(now - requestTime) > 5 * 60 * 1000) {
      return { valid: false, method: "HMAC", error: "Timestamp scaduto (replay protection)" };
    }
    
    // Calcola HMAC atteso
    const sortedRecipients = Array.isArray(data.recipients)
      ? [...data.recipients].map(function(e) { return String(e || "").trim().toLowerCase(); }).sort().join(',')
      : typeof data.recipients === "string"
        ? data.recipients.split(",").map(function(e) { return e.trim().toLowerCase(); }).sort().join(',')
        : "";
    const isHtmlStr = data.isHtml ? "true" : "false";
    const useBccStr = data.useBcc !== false ? "true" : "false";
    const message = [
      data.timestamp,
      data.subject || "",
      sortedRecipients,
      data.body || "",
      isHtmlStr,
      useBccStr
    ].join(':');
    
    const expectedHmac = computeHmacSha256(message, HMAC_SECRET);
    
    if (expectedHmac === data.hmac) {
      return { valid: true, method: "HMAC" };
    }
    return { valid: false, method: "HMAC", error: "Firma HMAC non valida" };
  }
  
  // Metodo 2: API Key semplice (fallback)
  if (API_KEY && typeof API_KEY === "string" && API_KEY.trim() !== "" && data.apiKey === API_KEY) {
    return { valid: true, method: "API_KEY" };
  }
  
  return { valid: false, method: "NONE", error: "Non autorizzato — API key o HMAC mancante/invalido" };
}

/**
 * Calcola HMAC-SHA256 usando le Utilities di GAS.
 */
function computeHmacSha256(message, secret) {
  const signature = Utilities.computeHmacSha256Signature(message, secret);
  return Utilities.base64Encode(signature);
}


// ═══════════════════════════════════════════════
// 🚦  RATE LIMITING
// ═══════════════════════════════════════════════

/**
 * Controlla e aggiorna il rate limit.
 * Usa PropertiesService per persistere i contatori tra le invocazioni.
 * 
 * @returns {{ allowed: boolean, remaining: number, error?: string }}
 */
function checkRateLimit() {
  const props = PropertiesService.getScriptProperties();
  const now = Date.now();
  const windowKey = "rl_window_start";
  const countKey = "rl_count";
  
  const windowStart = parseInt(props.getProperty(windowKey) || "0", 10);
  let count = parseInt(props.getProperty(countKey) || "0", 10);
  
  // Reset della finestra se è passato più di 1 minuto
  if (now - windowStart > 60 * 1000) {
    props.setProperty(windowKey, String(now));
    props.setProperty(countKey, "1");
    return { allowed: true, remaining: MAX_SENDS_PER_MINUTE - 1 };
  }
  
  // Dentro la finestra corrente
  if (count >= MAX_SENDS_PER_MINUTE) {
    return { 
      allowed: false, 
      remaining: 0, 
      error: `Rate limit superato (max ${MAX_SENDS_PER_MINUTE} invii/minuto). Riprova tra qualche secondo.`
    };
  }
  
  count++;
  props.setProperty(countKey, String(count));
  return { allowed: true, remaining: MAX_SENDS_PER_MINUTE - count };
}


// ═══════════════════════════════════════════════
// ✉️  VALIDAZIONE
// ═══════════════════════════════════════════════

/**
 * Valida un indirizzo email con regex e controllo dominio.
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
  if (!email || typeof email !== "string") return false;
  
  // Regex base per formato email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) return false;
  
  // Whitelist domini
  const domain = email.trim().toLowerCase().split("@")[1];
  return ALLOWED_DOMAINS.some(function(d) { return domain === d; });
}

/**
 * Filtra e valida un array di destinatari.
 * @param {string[]|string} recipients
 * @returns {{ valid: string[], invalid: string[] }}
 */
function validateRecipients(recipients) {
  var emailList = [];
  
  if (Array.isArray(recipients)) {
    emailList = recipients;
  } else if (typeof recipients === "string") {
    emailList = recipients.split(",");
  } else {
    return { valid: [], invalid: [] };
  }
  
  var valid = [];
  var invalid = [];
  
  emailList.forEach(function(email) {
    var trimmed = (email || "").trim().toLowerCase();
    if (!trimmed) return;
    if (isValidEmail(trimmed)) {
      // Deduplicazione
      if (valid.indexOf(trimmed) === -1) {
        valid.push(trimmed);
      }
    } else {
      invalid.push(trimmed);
    }
  });
  
  return { valid: valid, invalid: invalid };
}


// ═══════════════════════════════════════════════
// 📊  LOGGING
// ═══════════════════════════════════════════════

/**
 * Logga un evento sia su console che (opzionalmente) su Google Sheet.
 * 
 * @param {string} level - "INFO", "WARN", "ERROR"
 * @param {string} message - Messaggio di log
 * @param {object} [details] - Dettagli aggiuntivi
 */
function logEvent(level, message, details) {
  var logLine = "[" + level + "] " + new Date().toISOString() + " — " + message;
  
  if (details) {
    logLine += " | " + JSON.stringify(details);
  }
  
  // Console log (visibile nei log di GAS)
  if (level === "ERROR") {
    console.error(logLine);
  } else if (level === "WARN") {
    console.warn(logLine);
  } else {
    console.log(logLine);
  }
  
  // Google Sheet log (opzionale)
  if (LOG_SHEET_ID) {
    try {
      var sheet = SpreadsheetApp.openById(LOG_SHEET_ID).getSheetByName("EmailLog");
      if (!sheet) {
        sheet = SpreadsheetApp.openById(LOG_SHEET_ID).insertSheet("EmailLog");
        sheet.appendRow(["Timestamp", "Level", "Message", "Details"]);
        sheet.getRange(1, 1, 1, 4).setFontWeight("bold");
      }
      sheet.appendRow([
        new Date().toISOString(),
        level,
        message,
        details ? JSON.stringify(details) : ""
      ]);
    } catch (sheetError) {
      console.warn("[WARN] Impossibile scrivere sul Google Sheet di log: " + sheetError.message);
    }
  }
}


// ═══════════════════════════════════════════════
// 📬  INVIO BATCH
// ═══════════════════════════════════════════════

/**
 * Invia email in batch, rispettando i limiti di Gmail.
 * 
 * @param {string[]} recipients - Lista destinatari validati
 * @param {string} subject - Oggetto email
 * @param {string} body - Corpo email
 * @param {boolean} isHtml - Se true, body è HTML
 * @param {boolean} useBcc - Se true, usa BCC (destinatari nascosti)
 * @returns {{ totalSent: number, totalFailed: number, batchResults: object[] }}
 */
function sendInBatches(recipients, subject, body, isHtml, useBcc) {
  var batches = [];
  for (var i = 0; i < recipients.length; i += BATCH_SIZE) {
    batches.push(recipients.slice(i, i + BATCH_SIZE));
  }
  
  var batchResults = [];
  var totalSent = 0;
  var totalFailed = 0;
  
  batches.forEach(function(batch, index) {
    try {
      var emailOptions = {
        subject: subject,
        name: SENDER_NAME,
      };
      
      // Impostazione body
      if (isHtml) {
        emailOptions.htmlBody = body;
        // Fallback plain-text per client che non supportano HTML
        emailOptions.body = body.replace(/<[^>]*>/g, "").substring(0, 500) + "...";
      } else {
        emailOptions.body = body;
      }
      
      if (useBcc) {
        // BCC: invia a se stessi, mette tutti i destinatari in BCC
        emailOptions.to = Session.getActiveUser().getEmail();
        emailOptions.bcc = batch.join(",");
      } else {
        emailOptions.to = batch.join(",");
      }
      
      MailApp.sendEmail(emailOptions);
      
      totalSent += batch.length;
      batchResults.push({
        batchIndex: index + 1,
        count: batch.length,
        status: "OK"
      });
      
      logEvent("INFO", "Batch " + (index + 1) + "/" + batches.length + " inviato", {
        recipients: batch.length,
        useBcc: useBcc
      });
      
      // Pausa breve tra i batch per non sovraccaricare Gmail
      if (index < batches.length - 1) {
        Utilities.sleep(500);
      }
      
    } catch (batchError) {
      totalFailed += batch.length;
      batchResults.push({
        batchIndex: index + 1,
        count: batch.length,
        status: "ERROR",
        error: batchError.message
      });
      
      logEvent("ERROR", "Batch " + (index + 1) + " fallito", {
        error: batchError.message,
        recipients: batch.length
      });
    }
  });
  
  return {
    totalSent: totalSent,
    totalFailed: totalFailed,
    totalBatches: batches.length,
    batchResults: batchResults
  };
}


// ═══════════════════════════════════════════════
// 🌐  ENDPOINTS
// ═══════════════════════════════════════════════

/**
 * Crea una risposta JSON standard per GAS Web App.
 * IMPORTANTE: GAS Web Apps richiedono ContentService per risposte corrette.
 */
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * GET — Health check e status.
 * Utile per verificare che il bridge sia operativo e controllare la quota.
 * 
 * Esempio: curl "YOUR_GAS_URL"
 */
function doGet(e) {
  try {
    var quota = MailApp.getRemainingDailyQuota();
    
    return jsonResponse({
      status: "online",
      version: "2.0.0",
      service: "eversia Email Bridge",
      quota: {
        remainingToday: quota,
        batchSize: BATCH_SIZE,
        estimatedMaxRecipients: quota * BATCH_SIZE
      },
      auth: {
        hmacEnabled: !!HMAC_SECRET,
        apiKeyEnabled: !!API_KEY
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return jsonResponse({
      status: "error",
      error: error.message
    });
  }
}

/**
 * POST — Invio email principale.
 * 
 * Payload atteso:
 * {
 *   "apiKey": "...",            // Oppure "hmac" + "timestamp" per HMAC
 *   "recipients": ["a@b.it"],   // Array di email
 *   "subject": "...",
 *   "body": "...",
 *   "isHtml": true,
 *   "useBcc": true
 * }
 */
function doPost(e) {
  var startTime = Date.now();
  
  try {
    // ─── Parse del body ───
    if (!e || !e.postData || !e.postData.contents) {
      logEvent("ERROR", "Richiesta vuota o malformata");
      return jsonResponse({ 
        success: false, 
        error: "Richiesta vuota — nessun body ricevuto" 
      });
    }
    
    var data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (parseError) {
      logEvent("ERROR", "JSON non valido", { raw: e.postData.contents.substring(0, 200) });
      return jsonResponse({ 
        success: false, 
        error: "Body non è un JSON valido" 
      });
    }
    
    // ─── Autenticazione ───
    var auth = verifyAuth(data);
    if (!auth.valid) {
      logEvent("WARN", "Autenticazione fallita", { method: auth.method, error: auth.error });
      return jsonResponse({ 
        success: false, 
        error: auth.error 
      });
    }
    
    logEvent("INFO", "Richiesta autenticata", { method: auth.method });
    
    // ─── Rate Limiting ───
    var rateCheck = checkRateLimit();
    if (!rateCheck.allowed) {
      logEvent("WARN", "Rate limit superato");
      return jsonResponse({ 
        success: false, 
        error: rateCheck.error,
        rateLimitRemaining: 0
      });
    }
    
    // ─── Validazione campi obbligatori ───
    if (!data.recipients || !data.subject || !data.body) {
      logEvent("WARN", "Campi mancanti nella richiesta");
      return jsonResponse({ 
        success: false, 
        error: "Dati mancanti: recipients, subject e body sono obbligatori" 
      });
    }
    
    // ─── Controllo sicurezza HTML (prevenzione abusi) ───
    var htmlAbuseRegex = /<script\b|\bon(load|error)\s*=|javascript\s*:/i;
    if (htmlAbuseRegex.test(String(data.body || "")) || htmlAbuseRegex.test(String(data.subject || ""))) {
      logEvent("WARN", "Rilevato payload HTML/script potenzialmente dannoso");
      return jsonResponse({
        success: false,
        error: "Richiesta rifiutata per motivi di sicurezza: rilevato codice potenzialmente dannoso (tag script, eventi onload/onerror o link javascript)"
      });
    }
    
    // ─── Validazione destinatari ───
    var validation = validateRecipients(data.recipients);
    
    if (validation.valid.length === 0) {
      logEvent("WARN", "Nessun destinatario valido", { 
        invalid: validation.invalid.length 
      });
      return jsonResponse({ 
        success: false, 
        error: "Nessun destinatario valido. Verifica che gli indirizzi siano del dominio @liceoagnesi.edu.it",
        invalidEmails: validation.invalid.length
      });
    }
    
    // ─── Quota check ───
    var remainingQuota = MailApp.getRemainingDailyQuota();
    var requiredQuota = Math.ceil(validation.valid.length / BATCH_SIZE);
    
    if (remainingQuota < requiredQuota) {
      logEvent("ERROR", "Quota giornaliera insufficiente", { 
        required: requiredQuota, 
        remaining: remainingQuota 
      });
      return jsonResponse({ 
        success: false, 
        error: "Quota email giornaliera insufficiente. Richieste: " + requiredQuota + 
               " invocazioni, rimanenti: " + remainingQuota + ". Riprova domani.",
        quota: { required: requiredQuota, remaining: remainingQuota }
      });
    }
    
    // ─── Sanitizzazione subject ───
    var safeSubject = (data.subject || "").substring(0, 200);
    
    // ─── Invio in batch ───
    logEvent("INFO", "Inizio invio batch", { 
      totalRecipients: validation.valid.length,
      batches: Math.ceil(validation.valid.length / BATCH_SIZE),
      useBcc: !!data.useBcc,
      isHtml: !!data.isHtml,
      subject: safeSubject.substring(0, 50)
    });
    
    var result = sendInBatches(
      validation.valid, 
      safeSubject, 
      data.body, 
      !!data.isHtml, 
      data.useBcc !== false // Default: BCC attivo
    );
    
    var elapsed = Date.now() - startTime;
    
    logEvent("INFO", "Invio completato", { 
      sent: result.totalSent, 
      failed: result.totalFailed,
      elapsed: elapsed + "ms"
    });
    
    // ─── Risposta strutturata ───
    return jsonResponse({
      success: result.totalFailed === 0,
      partialSuccess: result.totalSent > 0 && result.totalFailed > 0,
      data: {
        sent: result.totalSent,
        failed: result.totalFailed,
        totalBatches: result.totalBatches,
        batchResults: result.batchResults,
        invalidEmailsSkipped: validation.invalid.length,
        elapsedMs: elapsed
      },
      quota: {
        remainingToday: MailApp.getRemainingDailyQuota()
      },
      rateLimitRemaining: rateCheck.remaining
    });
    
  } catch (error) {
    logEvent("ERROR", "Errore critico non gestito", { 
      error: error.message, 
      stack: error.stack 
    });
    
    return jsonResponse({ 
      success: false, 
      error: "Errore interno del bridge: " + error.message
    });
  }
}
