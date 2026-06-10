import React, { useState } from "react";
import { db } from "../../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import type { Student } from '../../types';
import Papa from "papaparse";
import { Loader2, FileText } from "lucide-react";

interface AttendanceExportProps {
    assemblyId: string;
    activityId: string;
    turnId: string;
    activityName: string;
}

export const AttendanceExport: React.FC<AttendanceExportProps> = ({ assemblyId, activityId, turnId, activityName }) => {
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async () => {
        setIsExporting(true);
        try {
            // 1. Fetch all students for this assembly
            const qS = query(collection(db, "students"), where("assemblyId", "==", assemblyId));
            const studentSnap = await getDocs(qS);
            const allStudents = studentSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));

            // 2. Filter students registered for THIS activity in THIS turn
            const registeredStudents = allStudents.filter(student =>
                student.scheduled_turns?.[turnId] === activityId
            );

            // 3. Sort alphabetically by Surname then Name
            const sortedStudents = [...registeredStudents].sort((a, b) => {
                const lastNameCmp = a.lastName.localeCompare(b.lastName);
                if (lastNameCmp !== 0) return lastNameCmp;
                return a.firstName.localeCompare(b.firstName);
            });

            // 4. Process data
            let presentCount = 0;
            let absentCount = 0;

            const exportData = sortedStudents.map((student, index) => {
                const presenceData = student.actual_location?.[turnId];
                const isPresent = presenceData?.activity_id === activityId && presenceData?.checked_in;

                if (isPresent) presentCount++;
                else absentCount++;

                return {
                    "#": index + 1,
                    "Cognome": student.lastName,
                    "Nome": student.firstName,
                    "Email": student.email,
                    "Stato": isPresent ? "PRESENTE" : "ASSENTE"
                };
            });

            // 5. Add summary row
            exportData.push({ "#": "", "Cognome": "", "Nome": "", "Email": "", "Stato": "" } as any);
            exportData.push({
                "#": "RIEPILOGO",
                "Cognome": `Presenti: ${presentCount}`,
                "Nome": `Assenti: ${absentCount}`,
                "Email": `Totale: ${sortedStudents.length}`,
                "Stato": ""
            } as any);

            // 6. Generate and Download CSV
            const csv = Papa.unparse(exportData);
            const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            const fileName = `presenze_${activityName.replace(/\s+/g, '_')}_T${turnId}_${new Date().toISOString().split('T')[0]}.csv`;

            link.href = url;
            link.setAttribute("download", fileName);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

        } catch (error) {
            console.error("Attendance Export failed:", error);
            alert("Errore durante l'esportazione delle presenze.");
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-lg transition-all font-black text-[9px] uppercase tracking-widest border border-white/10"
            title={`Esporta presenze Turno ${turnId}`}
        >
            {isExporting ? (
                <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
                <FileText className="w-3 h-3" />
            )}
            Report T{turnId}
        </button>
    );
};
