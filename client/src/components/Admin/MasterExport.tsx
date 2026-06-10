import React, { useState } from "react";
import { db } from "../../firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import type { Student, Activity, AssemblyRole, Assembly } from '../../types';
import { Loader2, FileSpreadsheet } from "lucide-react";
import ExcelJS from "exceljs";

interface MasterExportProps {
    assemblyId: string;
    assemblyName?: string;
}

const BORDER_THIN: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFCBD5E1' } }, 
    bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    left: { style: 'thin', color: { argb: 'FFCBD5E1' } }, 
    right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
};

const HEADER_FONT: Partial<ExcelJS.Font> = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };

function getThemeColorArgb(hex?: string) {
    if (!hex) return 'FF1E293B'; // Default Slate 800
    const clean = hex.replace('#', '').toUpperCase();
    if (clean.length === 6) return 'FF' + clean;
    return 'FF1E293B';
}

function styleHeaderRow(ws: ExcelJS.Worksheet, rowNum: number, fill: ExcelJS.FillPattern) {
    const row = ws.getRow(rowNum);
    row.eachCell(cell => {
        cell.fill = fill;
        cell.font = HEADER_FONT;
        cell.border = BORDER_THIN;
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    });
}

function autoWidth(ws: ExcelJS.Worksheet) {
    ws.columns.forEach(col => {
        let max = 12;
        col.eachCell?.({ includeEmpty: false }, cell => {
            const len = cell.value ? String(cell.value).length + 2 : 0;
            if (len > max) max = len;
        });
        col.width = Math.min(max, 45);
    });
}

export const MasterExport: React.FC<MasterExportProps> = ({ assemblyId, assemblyName }) => {
    const [isExporting, setIsExporting] = useState(false);

    const handleExportXLSX = async () => {
        setIsExporting(true);
        try {
            // Fetch assembly doc
            const assemblySnap = await getDoc(doc(db, "assemblies", assemblyId));
            const activeAssembly = assemblySnap.exists() ? { id: assemblySnap.id, ...assemblySnap.data() } as Assembly : undefined;

            // Fetch students
            const qS = query(collection(db, "students"), where("assemblyId", "==", assemblyId));
            const studentSnap = await getDocs(qS);
            const students = studentSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));

            // Fetch activities
            const qA = query(collection(db, "rooms"), where("assemblyId", "==", assemblyId));
            const activitySnap = await getDocs(qA);
            const activities = activitySnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Activity));
            const activityMap = activities.reduce((acc, curr) => {
                acc[curr.id] = curr; return acc;
            }, {} as Record<string, Activity>);

            // Fetch roles
            const qR = query(collection(db, "assembly_roles"), where("assemblyId", "==", assemblyId));
            const roleSnap = await getDocs(qR);
            const assemblyRoles = roleSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AssemblyRole));

            // Fetch admins
            const adminSnap = await getDocs(collection(db, "admins"));
            const adminsFromCol = adminSnap.docs.map(doc => ({ email: doc.data().email, role: doc.data().role || "ADMIN" }));
            const qUsers = query(collection(db, "users"), where("role", "in", ["ADMIN", "SVILUPPATORE"]));
            const userSnap = await getDocs(qUsers);
            const adminsFromUsers = userSnap.docs.map(doc => ({ email: doc.data().email, role: doc.data().role }));
            const mergedMap = new Map<string, { email: string; role: string }>();
            [...adminsFromCol, ...adminsFromUsers].forEach(a => {
                if (a.email) mergedMap.set(a.email.toLowerCase().trim(), a);
            });
            const globalAdmins = Array.from(mergedMap.values());

            // Determine Turns dynamically
            const turns = activeAssembly?.turn_ids && activeAssembly.turn_ids.length > 0
                ? activeAssembly.turn_ids
                : ["1", "2", "3"];

            // ── Dynamic Theme & Colors ──
            const themeColorHex = activeAssembly?.themeColor || "#0082e6";
            const themeColorArgb = getThemeColorArgb(themeColorHex);
            const THEME_FILL: ExcelJS.FillPattern = { type: 'pattern', pattern: 'solid', fgColor: { argb: themeColorArgb } };

            // Medals & Accents for staff tables
            const ACCENT_RM: ExcelJS.FillPattern = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } }; // Green
            const ACCENT_SEC: ExcelJS.FillPattern = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF59E0B' } }; // Amber
            const ACCENT_ADM: ExcelJS.FillPattern = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8B5CF6' } }; // Violet

            // ── Calculations ──
            const adminEmails = new Set(globalAdmins.map(a => a.email.toLowerCase().trim()));
            const actualStudents = students.filter(s => {
                const emailClean = s.email.toLowerCase().trim();
                if (adminEmails.has(emailClean)) return false;

                const hasSchedule = Object.keys(s.scheduled_turns || {}).length > 0;
                if (hasSchedule) return true;
                const hasStaffPresence = s.staff_actual_location && Object.keys(s.staff_actual_location).length > 0;
                if (hasStaffPresence) return false;
                const locValues = Object.values(s.actual_location || {});
                if (locValues.length > 0) {
                    const allStaff = locValues.every((loc: any) => loc?.activity_id === 'STAFF');
                    if (allStaff) return false;
                }
                return true;
            });

            let totalPresent = 0, totalAbsent = 0, totalGatecrashers = 0;
            actualStudents.forEach(s => {
                const hasPresence = Object.values(s.actual_location || {}).some(l => l?.checked_in);
                if (hasPresence) totalPresent++; else totalAbsent++;
                Object.values(s.actual_location || {}).forEach(l => { if (l?.gatecrasher) totalGatecrashers++; });
            });

            // ── Build Workbook ──
            const wb = new ExcelJS.Workbook();
            wb.creator = 'eversia';
            wb.created = new Date();

            // ═══════════════════════════════════════════
            // SHEET 1: STATISTICHE GENERALI (CON DETTAGLIO TURNI)
            // ═══════════════════════════════════════════
            const wsStats = wb.addWorksheet('Statistiche Generali');
            wsStats.addRow(['REPORT MASTER — ' + (assemblyName || activeAssembly?.name || 'Assemblea')]);
            wsStats.mergeCells('A1:B1');
            wsStats.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FF0F172A' } };
            wsStats.addRow(['Data Export', new Date().toLocaleString('it-IT')]);
            wsStats.addRow([]);
            wsStats.addRow(['Metrica', 'Valore']);
            styleHeaderRow(wsStats, 4, THEME_FILL);

            wsStats.addRow(['Totale Studenti Iscritti', actualStudents.length]);
            wsStats.addRow(['Studenti Presenti (min. 1 turno)', totalPresent]);
            wsStats.addRow(['Studenti Assenti (0 presenze)', totalAbsent]);
            wsStats.addRow(['Segnalazioni Imbucati totali', totalGatecrashers]);
            wsStats.addRow(['Numero Attività catalogate', activities.length]);

            // Add Turn by Turn Breakdown
            turns.forEach(t => {
                let enrolledT = 0;
                let presentT = 0;
                let absentT = 0;
                let gatecrasherT = 0;

                actualStudents.forEach(s => {
                    const hasSchedule = s.scheduled_turns?.[t] !== undefined && s.scheduled_turns?.[t] !== null;
                    const loc = s.actual_location?.[t];
                    const isPresent = loc?.checked_in;
                    
                    if (hasSchedule) enrolledT++;
                    if (isPresent) {
                        if (loc?.gatecrasher) {
                            gatecrasherT++;
                        } else {
                            presentT++;
                        }
                    } else if (hasSchedule) {
                        absentT++;
                    }
                });

                wsStats.addRow([]);
                wsStats.addRow([`STATISTICHE DETTAGLIATE TURNO ${t}`, '']);
                wsStats.mergeCells(`A${wsStats.rowCount}:B${wsStats.rowCount}`);
                wsStats.getCell(`A${wsStats.rowCount}`).font = { bold: true, size: 11, color: { argb: 'FF0F172A' } };
                wsStats.getCell(`A${wsStats.rowCount}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } }; // Light gray divider
                
                wsStats.addRow([`Studenti Iscritti al Turno ${t}`, enrolledT]);
                wsStats.addRow([`Presenze Effettive al Turno ${t}`, presentT]);
                wsStats.addRow([`Assenze al Turno ${t}`, absentT]);
                wsStats.addRow([`Studenti Imbucati al Turno ${t}`, gatecrasherT]);
            });
            autoWidth(wsStats);

            // ═══════════════════════════════════════════
            // SHEET 2: PERFORMANCE ATTIVITÀ
            // ═══════════════════════════════════════════
            const wsAct = wb.addWorksheet('Performance Attività');
            
            const actHeaders = ['Attività', 'Aula', 'Media Stelle', 'Num. Voti', 'Totale Stelle', 'Partecipanti Totali'];
            turns.forEach(t => {
                actHeaders.push(`Partecipanti T${t}`);
            });

            wsAct.addRow(actHeaders);
            styleHeaderRow(wsAct, 1, THEME_FILL);

            activities.forEach(act => {
                const rowData: any[] = [
                    act.name,
                    act.location_name || 'N/A',
                    act.rating_stats ? Number(act.rating_stats.average.toFixed(1)) : '-',
                    act.rating_stats?.count || 0,
                    act.rating_stats?.sum || 0,
                    Object.values(act.counts_by_turn || {}).reduce((a: number, b: number) => a + b, 0)
                ];
                turns.forEach(t => {
                    rowData.push(act.counts_by_turn?.[t] || 0);
                });
                wsAct.addRow(rowData);
            });
            autoWidth(wsAct);

            const getStaffPresenceStr = (email: string, turn: string) => {
                const clean = email.toLowerCase().trim();
                const s = students.find(x => x.email.toLowerCase() === clean);
                if (!s) return 'ASSENTE';
                
                const loc = s.staff_actual_location?.[turn] || s.staff_actual_location?.[`T${turn}`];
                if (loc?.checked_in) return 'PRESENTE';
                
                const oldLoc = s.actual_location?.[turn] || s.actual_location?.[`T${turn}`];
                if (oldLoc?.checked_in && oldLoc.activity_id === 'STAFF') return 'PRESENTE';
                
                return 'ASSENTE';
            };

            // ═══════════════════════════════════════════
            // SHEET 3: STAFF & RUOLI
            // ═══════════════════════════════════════════
            const wsStaff = wb.addWorksheet('Staff & Ruoli');

            // Room Managers
            wsStaff.addRow(['ROOM MANAGERS']);
            wsStaff.getCell('A1').font = { bold: true, size: 14 };
            wsStaff.addRow(['Email', 'Attività Assegnata', ...turns.map(t => `Presenza T${t}`)]);
            styleHeaderRow(wsStaff, 2, ACCENT_RM);
            const rms = assemblyRoles.filter(r => r.role === 'ROOM_MANAGER');
            rms.forEach(rm => {
                wsStaff.addRow([
                    rm.email, 
                    rm.activityId ? (activityMap[rm.activityId]?.name || 'N/D') : 'Non assegnata',
                    ...turns.map(t => getStaffPresenceStr(rm.email, t))
                ]);
            });
            if (rms.length === 0) wsStaff.addRow(['Nessun Room Manager assegnato', '', ...turns.map(() => '')]);

            // Security
            const secStart = wsStaff.rowCount + 2;
            wsStaff.addRow([]);
            wsStaff.addRow(['SECURITY & LOGISTICA']);
            wsStaff.getCell(`A${secStart + 1}`).font = { bold: true, size: 14 };
            wsStaff.addRow(['Email Security', ...turns.map(t => `Presenza T${t}`)]);
            styleHeaderRow(wsStaff, wsStaff.rowCount, ACCENT_SEC);
            const secs = assemblyRoles.filter(r => r.role === 'SECURITY');
            secs.forEach(sec => wsStaff.addRow([
                sec.email,
                ...turns.map(t => getStaffPresenceStr(sec.email, t))
            ]));
            if (secs.length === 0) wsStaff.addRow(['Nessun Security assegnato', ...turns.map(() => '')]);

            // Admins & Developers
            wsStaff.addRow([]);
            const admStart = wsStaff.rowCount + 1;
            wsStaff.addRow(['AMMINISTRATORI & SVILUPPATORI (GLOBALI)']);
            wsStaff.getCell(`A${admStart}`).font = { bold: true, size: 14 };
            wsStaff.addRow(['Email', 'Ruolo', ...turns.map(t => `Presenza T${t}`)]);
            styleHeaderRow(wsStaff, wsStaff.rowCount, ACCENT_ADM);
            globalAdmins.forEach(adm => wsStaff.addRow([
                adm.email,
                adm.role,
                ...turns.map(t => getStaffPresenceStr(adm.email, t))
            ]));
            if (globalAdmins.length === 0) wsStaff.addRow(['Nessun amministratore trovato', '', ...turns.map(() => '')]);

            autoWidth(wsStaff);

            // ═══════════════════════════════════════════
            // SHEET 4: REGISTRO STUDENTI COMPLETO (DINAMICO)
            // ═══════════════════════════════════════════
            const wsReg = wb.addWorksheet('Registro Studenti');
            
            const regHeaders = ['Cognome', 'Nome', 'Email', 'Classe'];
            turns.forEach(t => {
                regHeaders.push(`T${t} Iscrizione`, `T${t} Effettivo`, `T${t} Stato`, `T${t} Orario Check-in`);
            });
            wsReg.addRow(regHeaders);
            styleHeaderRow(wsReg, 1, THEME_FILL);

            actualStudents
                .sort((a, b) => (a.lastName || '').localeCompare(b.lastName || ''))
                .forEach(s => {
                    const cells: any[] = [
                        s.lastName || '-',
                        s.firstName || '-',
                        s.email || '-',
                        s.className || '-'
                    ];

                    turns.forEach(t => {
                        const schedId = s.scheduled_turns?.[t];
                        const schedName = schedId ? (activityMap[schedId]?.name || 'N/D') : '-';
                        const loc = s.actual_location?.[t];
                        const actualName = loc?.activity_id === 'STAFF'
                            ? 'Servizio Staff'
                            : (loc?.activity_id ? (activityMap[loc.activity_id]?.name || 'N/D') : '-');
                        
                        let stato = 'ASSENTE';
                        if (loc?.checked_in) stato = loc.gatecrasher ? 'IMBUCATO' : 'PRESENTE';

                        // Timestamp
                        let timestamp = '-';
                        if (loc?.timestamp) {
                            try {
                                const ts = loc.timestamp.toDate ? loc.timestamp.toDate() : new Date(loc.timestamp);
                                timestamp = ts.toLocaleString('it-IT');
                            } catch { timestamp = '-'; }
                        } else if (loc?.markedAt) {
                            timestamp = loc.markedAt;
                        }

                        cells.push(schedName, actualName, stato, timestamp);
                    });

                    const row = wsReg.addRow(cells);

                    // Color-code status cells dynamically (4 columns per turn now)
                    turns.forEach((_, i) => {
                        const colIdx = 7 + i * 4; // Status cell for Turn i
                        const cell = row.getCell(colIdx);
                        const val = String(cell.value);
                        
                        if (val === 'IMBUCATO') {
                            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }; // Light red
                            cell.font = { color: { argb: 'FF991B1B' }, bold: true }; // Dark red
                        } else if (val === 'PRESENTE') {
                            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } }; // Light green
                            cell.font = { color: { argb: 'FF065F46' }, bold: true }; // Dark green
                        } else if (val === 'ASSENTE') {
                            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } }; // Light gray
                            cell.font = { color: { argb: 'FF9CA3AF' } }; // Gray
                        }
                    });
                });
            autoWidth(wsReg);

            // ═══════════════════════════════════════════
            // SHEET 5: VALUTAZIONI & STELLE (NEW! ANONIMO PER GDPR)
            // ═══════════════════════════════════════════
            const wsFeedback = wb.addWorksheet('Valutazioni & Stelle');
            wsFeedback.addRow(['Attività', 'Turno', 'Classe', 'Valutazione']);
            styleHeaderRow(wsFeedback, 1, THEME_FILL);

            let feedbackCount = 0;
            actualStudents.forEach(s => {
                if (!s.actual_location) return;
                Object.entries(s.actual_location).forEach(([t, loc]: [string, any]) => {
                    if (loc?.rating) {
                        feedbackCount++;
                        const actName = loc.activity_id === 'STAFF'
                            ? 'Servizio Staff'
                            : (loc.activity_id ? (activityMap[loc.activity_id]?.name || 'N/D') : '-');
                        wsFeedback.addRow([
                            actName,
                            `Turno ${t}`,
                            s.className || 'N/D',
                            `${loc.rating} ★`
                        ]);
                    }
                });
            });

            if (feedbackCount === 0) {
                wsFeedback.addRow(['Nessuna valutazione registrata per questa assemblea', '', '', '']);
            }
            autoWidth(wsFeedback);

            // ── Download ──
            const buffer = await wb.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            const now = new Date();
            const dateStr = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;
            const cleanName = (assemblyName || activeAssembly?.name || 'assemblea')
                .toLowerCase()
                .replace(/[^a-z0-9]/g, '-')
                .replace(/-+/g, '-');
            link.download = `report-${cleanName}-${dateStr}.xlsx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
        } catch (e) {
            console.error(e);
            alert("Errore esportazione XLSX.");
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <button
            onClick={handleExportXLSX}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest disabled:opacity-50"
        >
            {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
            Export Master XLSX
        </button>
    );
};
