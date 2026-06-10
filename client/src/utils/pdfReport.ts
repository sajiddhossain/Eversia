import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Activity, Student } from "../types";
import { getTodayIT } from "./dateUtils";

interface PDFOptions {
    includeCharts?: boolean;
    chartElement?: HTMLElement;
    includeStaffStats?: boolean;
    includeVagabondi?: boolean;
    includeImbucati?: boolean;
}

/**
 * Generates a PDF report for the current assembly with advanced customization.
 */
export const generatePDFReport = async (
    assemblyName: string,
    assemblyDate: string,
    activities: Activity[],
    students: Student[],
    currentTurn: string,
    options: PDFOptions = {}
) => {
    let html2canvas: ((element: HTMLElement, options?: Record<string, unknown>) => Promise<HTMLCanvasElement>) | null = null;
    if (options.includeCharts && options.chartElement) {
        const h2cModule = await import("html2canvas");
        html2canvas = h2cModule.default || h2cModule;
    }

    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();

    // ── Header ──
    pdf.setFillColor(30, 30, 30);
    pdf.rect(0, 0, pageWidth, 40, "F");

    pdf.setTextColor(226, 243, 60); // Primary color
    pdf.setFontSize(24);
    pdf.setFont("helvetica", "bold");
    pdf.text("REPORT ASSEMBLEA", 14, 18);

    pdf.setTextColor(200, 200, 200);
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.text(`${assemblyName.toUpperCase()} — ${assemblyDate || getTodayIT()}`, 14, 26);
    pdf.text(`Generato il: ${new Date().toLocaleString("it-IT")}`, 14, 32);
    pdf.text(`Turno: ${currentTurn === 'ALL' ? 'Tutti i Turni' : `Turno ${currentTurn}`}`, pageWidth - 14, 18, { align: "right" });

    // ── Global Stats ──
    const presentCount = students.filter(s => {
        const locValues = Object.values(s.actual_location || {});
        return locValues.some((loc) => loc?.checked_in === true);
    }).length;

    const statsY = 50;
    pdf.setTextColor(30, 30, 30);
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.text("Metriche Chiave", 14, statsY);

    const metrics = [
        { label: "Studenti Totali", value: students.length.toString() },
        { label: "Presenti", value: presentCount.toString() },
        { label: "Partecipazione", value: `${students.length > 0 ? Math.round((presentCount / students.length) * 100) : 0}%` },
        { label: "Attività Attive", value: activities.length.toString() }
    ];

    let currentX = 14;
    metrics.forEach(m => {
        pdf.setFontSize(8);
        pdf.setTextColor(100, 100, 100);
        pdf.text(m.label.toUpperCase(), currentX, statsY + 8);
        pdf.setFontSize(12);
        pdf.setTextColor(30, 30, 30);
        pdf.text(m.value, currentX, statsY + 14);
        currentX += 50;
    });

    // ── Charts (If requested) ──
    let nextY = statsY + 25;
    if (options.includeCharts && options.chartElement) {
        try {
            const canvas = await html2canvas!(options.chartElement, {
                backgroundColor: "#0a0a0a",
                scale: 2
            });
            const imgData = canvas.toDataURL("image/png");
            const imgWidth = 180;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            pdf.addImage(imgData, "PNG", (pageWidth - imgWidth) / 2, nextY, imgWidth, imgHeight);
            nextY += imgHeight + 15;
        } catch (err) {
            console.error("Failed to capture chart:", err);
        }
    }

    // ── Activities Table ──
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.text("Dettaglio Attività", 14, nextY);

    const tableData = activities
        .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
        .map(a => {
            const count = currentTurn === 'ALL'
                ? Object.values(a.counts_by_turn || {}).reduce((s, c) => s + c, 0)
                : (a.counts_by_turn?.[currentTurn] || 0);
            const cap = currentTurn === 'ALL'
                ? a.max_capacity * (a.turn_ids?.length || 1)
                : a.max_capacity;
            const saturation = cap > 0 ? Math.round((count / cap) * 100) : 0;

            return [
                a.name,
                a.location_name || "N/D",
                (a.turn_ids || []).map(t => `T${t}`).join(", "),
                `${count} / ${cap}`,
                `${saturation}%`,
            ];
        });

    autoTable(pdf, {
        startY: nextY + 5,
        head: [["Attività", "Aula", "Turni", "Presenza", "Saturazione"]],
        body: tableData,
        theme: "striped",
        headStyles: { fillColor: [30, 30, 30], textColor: [226, 243, 60], fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        margin: { left: 14, right: 14 }
    });

    const lastAutoTableY = (pdf as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY;
    if (lastAutoTableY !== undefined) {
        nextY = lastAutoTableY + 15;
    }

    // ── Vagabondi (If requested) ──
    if (options.includeVagabondi) {
        const vagabondi = students.filter(s => {
            const locValues = Object.values(s.actual_location || {});
            return !locValues.some((loc) => loc?.checked_in === true);
        });

        if (vagabondi.length > 0) {
            if (nextY > 160) { pdf.addPage(); nextY = 20; }
            pdf.setFontSize(14);
            pdf.setFont("helvetica", "bold");
            pdf.text(`Studenti non Registrati (${vagabondi.length})`, 14, nextY);

            autoTable(pdf, {
                startY: nextY + 5,
                head: [["Cognome", "Nome", "Email"]],
                body: vagabondi
                    .sort((a, b) => (a.lastName || "").localeCompare(b.lastName || ""))
                    .map(s => [s.lastName, s.firstName, s.email]),
                theme: "grid",
                headStyles: { fillColor: [200, 50, 50], textColor: [255, 255, 255], fontSize: 9 },
                bodyStyles: { fontSize: 8 },
            });
            const lastAutoTableY2 = (pdf as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY;
            if (lastAutoTableY2 !== undefined) {
                nextY = lastAutoTableY2 + 15;
            }
        }
    }

    // ── Studenti Fuori Posto (If requested) ──
    if (options.includeImbucati) {
        const imbucati = students.filter(s => {
            const expected = Object.values(s.scheduled_turns || {});
            const actual = Object.values(s.actual_location || {});
            return actual.some((loc) => loc?.activity_id && !expected.includes(loc.activity_id));
        });

        if (imbucati.length > 0) {
            if (nextY > 160) { pdf.addPage(); nextY = 20; }
            pdf.setFontSize(14);
            pdf.setFont("helvetica", "bold");
            pdf.text(`Studenti Fuori Posto (${imbucati.length})`, 14, nextY);

            autoTable(pdf, {
                startY: nextY + 5,
                head: [["Studente", "Attività Attuale", "Attività Prevista"]],
                body: imbucati.map(s => {
                    const actualAct = (Object.values(s.actual_location || {})[0] as { activity_id?: string } | null)?.activity_id || "-";
                    const expectedAct = Object.values(s.scheduled_turns || {}).join(", ") || "-";
                    return [`${s.lastName} ${s.firstName}`, actualAct, expectedAct];
                }),
                theme: "grid",
                headStyles: { fillColor: [245, 158, 11], textColor: [0, 0, 0], fontSize: 9 },
                bodyStyles: { fontSize: 8 },
            });
        }
    }

    // Save
    pdf.save(`Report_${assemblyName.replace(/\s+/g, '_')}_${getTodayIT()}.pdf`);
};
