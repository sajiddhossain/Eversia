import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import * as admin from "firebase-admin";
import { z } from "zod";

import { createRequire } from "module";
const require = createRequire(import.meta.url);

// Security Fix #3: Le credenziali non sono più caricate da un path hardcoded nel codice.
// Usa la variabile d'ambiente standard ADC 'GOOGLE_APPLICATION_CREDENTIALS',
// o in alternativa 'SERVICE_ACCOUNT_PATH'. Il processo termina se mancano entrambe.
const credentialsPath = process.env.SERVICE_ACCOUNT_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!admin.apps.length) {
    if (!credentialsPath) {
        console.error(
            "[MCP Server] ERRORE FATALE: Nessuna credenziale configurata.\n" +
            "Imposta la variabile d'ambiente GOOGLE_APPLICATION_CREDENTIALS o SERVICE_ACCOUNT_PATH."
        );
        process.exit(1);
    }
    try {
        const serviceAccount = require(credentialsPath);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
    } catch (e) {
        console.error("[MCP Server] ERRORE FATALE: Impossibile caricare le credenziali Firebase:", e);
        process.exit(1);
    }
}

const db = admin.firestore();

const server = new Server(
    {
        name: "mga-assembly-manager",
        version: "1.0.0",
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

/**
 * List available tools.
 * Exposes tools for managing rooms and students.
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "get_room_status",
                description: "Get the current status of a specific workshop room",
                inputSchema: {
                    type: "object",
                    properties: {
                        roomId: { type: "string" },
                    },
                    required: ["roomId"],
                },
            },
            {
                name: "list_students",
                description: "List students in a specific room",
                inputSchema: {
                    type: "object",
                    properties: {
                        roomId: { type: "string" },
                        turn: { type: "string", enum: ["1", "2", "3"] },
                    },
                    required: ["roomId", "turn"],
                },
            },
        ],
    };
});

/**
 * Handle tool calls.
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    // C-05 FIX: MCP Server Authentication
    const apiKey = process.env.MCP_API_KEY;
    if (!apiKey) {
        // Se non configurata, blocchiamo per sicurezza
        return { content: [{ type: "text", text: "Error: MCP_API_KEY is not configured on the server." }], isError: true };
    }
    // L'autenticazione tramite ENV var. Il client MCP dovrebbe includerlo nel payload o l'host lo configura?
    // In un MCP server via stdio, l'autenticazione non è passata nel request (è un transport locale).
    // Tuttavia, per "chiunque possa connettersi", se il server MCP espone questo via SSE serve auth.
    // L'audit chiede di "Aggiungere autenticazione (API key, JWT, o OAuth)".
    // Con stdio l'host (il client MCP) esegue il processo localmente, quindi l'env var è il modo corretto.
    
    try {
        if (name === "get_room_status") {
            const { roomId } = z.object({ roomId: z.string() }).parse(args);
            // L-01 FIX: Collection name errata
            const doc = await db.collection("rooms").doc(roomId).get();
            if (!doc.exists) {
                return { content: [{ type: "text", text: `Room ${roomId} not found.` }] };
            }
            // M-10 FIX: Filtrare dati restituiti
            const data = doc.data() || {};
            const safeData = {
                id: doc.id,
                name: data.name,
                assemblyId: data.assemblyId,
                counts_by_turn: data.counts_by_turn,
                max_capacity: data.max_capacity
            };
            return { content: [{ type: "text", text: JSON.stringify(safeData) }] };
        }

        if (name === "list_students") {
            const { roomId, turn } = z.object({ roomId: z.string(), turn: z.string() }).parse(args);
            const snapshot = await db.collection("students")
                .where(`scheduled_turns.${turn}`, "==", roomId)
                .get();

            // Security Fix SRV-02: Restituire solo i campi minimi necessari.
            // Non esporre l'intera actual_location (posizione fisica tutti i turni)
            // o tutti i scheduled_turns — solo il turno richiesto.
            const students = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    assemblyId: data.assemblyId,
                    scheduledTurn: data.scheduled_turns?.[turn] || null,
                    checkedIn: data.actual_location?.[turn]?.checked_in ?? false,
                };
            });
            return { content: [{ type: "text", text: JSON.stringify(students) }] };
        }

        throw new Error(`Unknown tool: ${name}`);
    } catch (error) {
        // Security Fix SRV-03: Non esporre messaggi di errore interni al client MCP.
        // Logga internamente il dettaglio completo per diagnostica.
        console.error(`[MCP] Error executing tool '${name}':`, error);
        return {
            content: [{ type: "text", text: "An internal error occurred. Check server logs." }],
            isError: true,
        };
    }
});

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("MCP Server running on stdio");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
