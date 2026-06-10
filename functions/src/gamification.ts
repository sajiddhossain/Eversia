import { onDocumentUpdated, onDocumentWritten, onDocumentCreated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

const db = admin.firestore();

interface BadgeCriteria {
    type: 'XP_THRESHOLD' | 'ASSEMBLY_COUNT' | 'STREAK' | 'FRIEND_COUNT' | 'CHECKIN_COUNT' | 'SECURITY_INSPECTIONS' | 'STAFF_ASSEMBLIES_COUNT' | 'MANUAL';
    value?: number;
}

interface BadgeTemplate {
    id: string;
    name: string;
    description: string;
    image: string;
    category: string;
    rarity: string;
    maxSupply?: number;
    currentSupply?: number;
    criteria?: BadgeCriteria;
}

interface EarnedBadge {
    badgeId: string;
    awardedAt: number;
    awardedBy: string;
    customMessage?: string;
}

export const onUserProfileUpdate = onDocumentUpdated({ document: "users/{userId}", region: 'europe-west1' }, async (event) => {
    const snap = event.data;
    if (!snap) return;

    const beforeData = snap.before.data();
    const afterData = snap.after.data();
    const userId = event.params.userId;

    // We only care if relevant stats changed
    const relevantStats = ['xp', 'totalAssemblies', 'streak', 'friendCount', 'totalCheckIns', 'friends', 'securityInspections', 'staffAssembliesCount'];
    const hasStatChanged = relevantStats.some(stat => beforeData[stat] !== afterData[stat]);

    if (!hasStatChanged) {
        return; // Nothing to evaluate
    }

    // Sync stats and level
    const userUpdates: Record<string, any> = {};
    
    const correctLevel = Math.max(1, Math.floor(Math.sqrt((afterData.xp || 0) / 100)));
    if ((afterData.level || 1) !== correctLevel) {
        userUpdates.level = correctLevel;
    }
    
    const correctFriendCount = (afterData.friends || []).length;
    if ((afterData.friendCount || 0) !== correctFriendCount) {
        userUpdates.friendCount = correctFriendCount;
    }
    
    const beforeStreakDate = beforeData.lastStreakDate;
    const afterStreakDate = afterData.lastStreakDate;
    const isDailyCheckIn = afterStreakDate && beforeStreakDate !== afterStreakDate;
    if (isDailyCheckIn) {
        userUpdates.totalCheckIns = FieldValue.increment(1);
    }
    
    if (Object.keys(userUpdates).length > 0) {
        await db.doc(`users/${userId}`).update(userUpdates);
        console.log(`[Gamification Trigger] Corrected user ${userId} stats:`, userUpdates);
        return; // Let the next invocation triggered by this update handle badge evaluation
    }

    await evaluateAndAwardBadges(userId, afterData);
});

export async function evaluateAndAwardBadges(userId: string, afterData: any) {
    // Fetch all badges
    const badgesSnap = await db.collection('badges').get();
    const templates: BadgeTemplate[] = badgesSnap.docs.map(d => ({ id: d.id, ...d.data() } as BadgeTemplate));

    const earnedIds = new Set((afterData.earnedBadges || []).map((eb: EarnedBadge) => eb.badgeId));
    const unearnedTemplates = templates.filter(t => !earnedIds.has(t.id));

    if (unearnedTemplates.length === 0) return;

    const badgesToAward: BadgeTemplate[] = [];

    // Evaluate criteria
    for (const badge of unearnedTemplates) {
        if (!badge.criteria || badge.criteria.type === 'MANUAL') continue;

        const { type, value = 0 } = badge.criteria;
        let meetsCriteria = false;

        switch (type) {
            case 'XP_THRESHOLD':
                meetsCriteria = (afterData.xp || 0) >= value;
                break;
            case 'ASSEMBLY_COUNT':
                meetsCriteria = (afterData.totalAssemblies || 0) >= value;
                break;
            case 'STREAK':
                meetsCriteria = (afterData.streak || 0) >= value;
                break;
            case 'FRIEND_COUNT':
                meetsCriteria = (afterData.friendCount || 0) >= value;
                break;
            case 'CHECKIN_COUNT':
                meetsCriteria = (afterData.totalCheckIns || 0) >= value;
                break;
            case 'SECURITY_INSPECTIONS':
                meetsCriteria = (afterData.securityInspections || 0) >= value;
                break;
            case 'STAFF_ASSEMBLIES_COUNT':
                meetsCriteria = (afterData.staffAssembliesCount || 0) >= value;
                break;
            default:
                break;
        }

        if (meetsCriteria) {
            badgesToAward.push(badge);
        }
    }

    if (badgesToAward.length === 0) return;

    const userRef = db.doc(`users/${userId}`);

    // Process awards in a transaction to ensure safe updates of currentSupply
    try {
        await db.runTransaction(async (tx) => {
            const userSnap = await tx.get(userRef);
            if (!userSnap.exists) return;
            const uData = userSnap.data()!;
            
            const currentEarned = uData.earnedBadges || [];
            const newEarnedBadges: EarnedBadge[] = [];
            const badgeRefsToUpdate = new Map<string, number>();
            
            const RARITY_XP: Record<string, number> = {
                'COMMON': 100,
                'UNCOMMON': 200,
                'RARE': 400,
                'EPIC': 800,
                'LEGENDARY': 1500
            };
            let totalXpToAward = 0;

            for (const badge of badgesToAward) {
                // Check if already earned concurrently
                if (currentEarned.some((eb: EarnedBadge) => eb.badgeId === badge.id) || newEarnedBadges.some(eb => eb.badgeId === badge.id)) {
                    continue;
                }

                const badgeRef = db.doc(`badges/${badge.id}`);
                const badgeSnap = await tx.get(badgeRef);
                if (!badgeSnap.exists) continue;

                const bData = badgeSnap.data() as BadgeTemplate;
                if (bData.maxSupply && (bData.currentSupply || 0) >= bData.maxSupply) {
                    continue; // Supply exausted
                }

                newEarnedBadges.push({
                    badgeId: badge.id,
                    awardedAt: Date.now(),
                    awardedBy: 'system',
                    customMessage: `Sbloccato automaticamente per aver soddisfatto il criterio: ${badge.name}`
                });

                badgeRefsToUpdate.set(badge.id, (bData.currentSupply || 0) + 1);
                totalXpToAward += RARITY_XP[bData.rarity || 'COMMON'] || 50;
            }

            if (newEarnedBadges.length > 0) {
                const updates: Record<string, any> = {
                    earnedBadges: FieldValue.arrayUnion(...newEarnedBadges)
                };

                if (totalXpToAward > 0) {
                    updates.xp = FieldValue.increment(totalXpToAward);
                    const currentXP = uData.xp || 0;
                    const newXP = currentXP + totalXpToAward;
                    const newLevel = Math.max(1, Math.floor(Math.sqrt(newXP / 100)));
                    if (newLevel !== (uData.level || 1)) {
                        updates.level = newLevel;
                    }
                }

                tx.update(userRef, updates);

                for (const [badgeId, newSupply] of badgeRefsToUpdate.entries()) {
                    tx.update(db.doc(`badges/${badgeId}`), {
                        currentSupply: newSupply
                    });
                }
                console.log(`[evaluateAndAwardBadges] Assegnati ${newEarnedBadges.length} badge all'utente ${userId} (+${totalXpToAward} XP)`);
            }
        });
    } catch (error) {
        console.error("Errore durante l'assegnazione automatica dei badge:", error);
    }
}

export const onStudentDocumentWritten = onDocumentWritten({
    document: "students/{studentId}",
    region: "europe-west1"
}, async (event) => {
    const beforeData = event.data?.before?.data();
    const afterData = event.data?.after?.data();

    // Determine the email associated with this student record
    const email = (afterData?.email || beforeData?.email)?.toLowerCase();
    if (!email) return;

    const countCheckIns = (actualLocation: any) => {
        if (!actualLocation) return 0;
        return Object.values(actualLocation).filter((loc: any) => loc && loc.checked_in === true && loc.activity_id !== 'STAFF').length;
    };

    const countStaffCheckIns = (staffActualLocation: any) => {
        if (!staffActualLocation) return 0;
        const keys = new Set();
        Object.entries(staffActualLocation).forEach(([k, loc]) => {
            if (loc && (loc as any).checked_in === true) {
                keys.add(k.replace('T', ''));
            }
        });
        return keys.size;
    };

    const beforeCheckIns = countCheckIns(beforeData?.actual_location);
    const afterCheckIns = countCheckIns(afterData?.actual_location);
    const checkInDelta = afterCheckIns - beforeCheckIns;

    const beforeStaffCheckIns = countStaffCheckIns(beforeData?.staff_actual_location);
    const afterStaffCheckIns = countStaffCheckIns(afterData?.staff_actual_location);

    // Check-in implies attendance to this assembly
    const beforeHasCheckIn = beforeCheckIns > 0 || beforeStaffCheckIns > 0;
    const afterHasCheckIn = afterCheckIns > 0 || afterStaffCheckIns > 0;
    
    let assemblyDelta = 0;
    if (!beforeHasCheckIn && afterHasCheckIn) {
        assemblyDelta = 1;
    } else if (beforeHasCheckIn && !afterHasCheckIn) {
        assemblyDelta = -1;
    }

    if (checkInDelta === 0 && assemblyDelta === 0 && beforeStaffCheckIns === afterStaffCheckIns) {
        return;
    }

    // Find the corresponding user doc
    const userSnap = await db.collection("users").where("email", "==", email).limit(1).get();
    if (userSnap.empty) {
        console.log(`[Student Trigger] User with email ${email} not found in users collection.`);
        return;
    }

    const userDoc = userSnap.docs[0];
    const userId = userDoc.id;
    const userRef = db.doc(`users/${userId}`);

    // Call recalculateUserStaffAssemblies if staff presence changed
    if (beforeStaffCheckIns !== afterStaffCheckIns) {
        console.log(`[Student Trigger] Staff check-in status changed for ${email} (${beforeStaffCheckIns} -> ${afterStaffCheckIns}). Recalculating staff...`);
        await recalculateUserStaffAssemblies(email, userId);
    }

    if (checkInDelta !== 0 || assemblyDelta !== 0) {
        // Attendance bonus of 250 XP if user has check-in for all 3 turns
        let attendanceBonusDelta = 0;
        if (beforeCheckIns < 3 && afterCheckIns === 3) {
            attendanceBonusDelta = 250;
        } else if (beforeCheckIns === 3 && afterCheckIns < 3) {
            attendanceBonusDelta = -250;
        }

        const xpDelta = (checkInDelta * 250) + attendanceBonusDelta;
        const updates: Record<string, any> = {};

        if (checkInDelta !== 0) {
            updates.totalCheckIns = FieldValue.increment(checkInDelta);
        }
        if (assemblyDelta !== 0) {
            updates.totalAssemblies = FieldValue.increment(assemblyDelta);
        }
        if (xpDelta !== 0) {
            updates.xp = FieldValue.increment(xpDelta);
        }

        if (Object.keys(updates).length > 0) {
            await userRef.update(updates);
            console.log(`[Student Trigger] Updated stats for user ${userId} (${email}):`, updates);
        }
    }
});

// Helper function to recalculate the number of archived assemblies a user served as staff
async function recalculateUserStaffAssemblies(email: string, userId: string) {
    const cleanEmail = email.toLowerCase().trim();
    
    // Find all assembly roles assigned to this email
    const allRolesSnap = await db.collection("assembly_roles").where("email", "==", cleanEmail).get();
    const assemblyIds = Array.from(new Set(allRolesSnap.docs.map(doc => doc.data().assemblyId).filter(Boolean)));

    const uniqueAssemblies = new Set<string>();
    const assemblyToRoles: Record<string, string[]> = {};

    if (assemblyIds.length > 0) {
        // Fetch all student documents for this user to verify presence
        const studentDocsSnap = await db.collection("students").where("email", "==", cleanEmail).get();
        const studentDocsByAssembly = new Map<string, any>();
        studentDocsSnap.forEach(d => {
            studentDocsByAssembly.set(d.data().assemblyId, d.data());
        });

        // Fetch all assemblies in parallel to verify their archive status
        const assemblySnaps = await Promise.all(assemblyIds.map(id => db.collection("assemblies").doc(id).get()));
        const archivedAssemblyIds = new Set<string>();
        
        assemblySnaps.forEach(snap => {
            if (snap.exists && snap.data()?.status === 'ARCHIVIATA') {
                archivedAssemblyIds.add(snap.id);
            }
        });

        allRolesSnap.forEach(docSnap => {
            const rData = docSnap.data();
            if (rData.assemblyId && ['SECURITY', 'ROOM_MANAGER'].includes(rData.role) && archivedAssemblyIds.has(rData.assemblyId)) {
                const sData = studentDocsByAssembly.get(rData.assemblyId);
                const isStaffLocPresent = sData?.staff_actual_location && Object.values(sData.staff_actual_location).some((loc: any) => loc && loc.checked_in === true);
                const isOldStaffLocPresent = sData?.actual_location && Object.values(sData.actual_location).some((loc: any) => loc && loc.checked_in === true && loc.activity_id === 'STAFF');
                const isPresent = isStaffLocPresent || isOldStaffLocPresent;
                if (isPresent) {
                    uniqueAssemblies.add(rData.assemblyId);
                    if (!assemblyToRoles[rData.assemblyId]) {
                        assemblyToRoles[rData.assemblyId] = [];
                    }
                    assemblyToRoles[rData.assemblyId].push(rData.role);
                }
            }
        });
    }

    const staffAssembliesCount = uniqueAssemblies.size;
    const staffAssemblies = Array.from(uniqueAssemblies);

    // Calculate total staff XP reward based on roles per assembly
    let staffXp = 0;
    staffAssemblies.forEach(asmId => {
        const roles = assemblyToRoles[asmId] || [];
        let maxRoleXp = 0;
        roles.forEach(role => {
            const xp = role === 'ROOM_MANAGER' ? 1200 : 1000;
            if (xp > maxRoleXp) maxRoleXp = xp;
        });
        staffXp += maxRoleXp;
    });

    const userRef = db.doc(`users/${userId}`);
    await db.runTransaction(async (tx) => {
        const userSnap = await tx.get(userRef);
        if (!userSnap.exists) return;

        const userData = userSnap.data()!;
        const oldStaffXp = userData.staffXp || 0;
        const xpDelta = staffXp - oldStaffXp;

        const updates: Record<string, any> = {
            staffAssemblies,
            staffAssembliesCount,
            staffXp
        };

        if (xpDelta > 0) {
            updates.xp = FieldValue.increment(xpDelta);
            console.log(`[Recalculate Staff] User ${userId} (${cleanEmail}) completed staff role. Staff XP changed from ${oldStaffXp} to ${staffXp}. Awarding +${xpDelta} XP.`);
            
            // Log XP award to event log
            db.collection("event_log").add({
                userId,
                type: "BADGE_EARNED", // Use badge source or similar
                details: `Staff Reward: +${xpDelta} XP per aver contribuito a: ${staffAssemblies.join(', ')}`,
                timestamp: Date.now()
            });
        } else if (xpDelta < 0) {
            updates.xp = FieldValue.increment(xpDelta);
            console.log(`[Recalculate Staff] User ${userId} (${cleanEmail}) staff XP changed from ${oldStaffXp} to ${staffXp}. Deducting ${Math.abs(xpDelta)} XP.`);
        }

        tx.update(userRef, updates);
    });
}

export const onAssemblyRoleWritten = onDocumentWritten({
    document: "assembly_roles/{roleId}",
    region: "europe-west1"
}, async (event) => {
    const beforeData = event.data?.before?.data();
    const afterData = event.data?.after?.data();

    const email = (afterData?.email || beforeData?.email)?.toLowerCase();
    if (!email) return;

    // Find the corresponding user doc
    const userSnap = await db.collection("users").where("email", "==", email).limit(1).get();
    if (userSnap.empty) {
        console.log(`[AssemblyRole Trigger] User with email ${email} not found in users collection.`);
        return;
    }

    const userId = userSnap.docs[0].id;
    await recalculateUserStaffAssemblies(email, userId);
});

export const onUserProfileCreated = onDocumentCreated({
    document: "users/{userId}",
    region: "europe-west1"
}, async (event) => {
    const snap = event.data;
    if (!snap) return;

    const data = snap.data();
    const userId = event.params.userId;
    const email = data.email?.toLowerCase();
    if (!email) return;

    await recalculateUserStaffAssemblies(email, userId);
});

export const onAssemblyUpdated = onDocumentUpdated({
    document: "assemblies/{assemblyId}",
    region: "europe-west1"
}, async (event) => {
    const snap = event.data;
    if (!snap) return;

    const beforeStatus = snap.before.data()?.status;
    const afterStatus = snap.after.data()?.status;
    const assemblyId = event.params.assemblyId;

    // When an assembly is archived, trigger staff count update for everyone who was staff for this assembly
    if (beforeStatus !== 'ARCHIVIATA' && afterStatus === 'ARCHIVIATA') {
        console.log(`[Assembly Status Trigger] Assembly ${assemblyId} archived. Updating staff counts and awarding XP.`);
        const rolesSnap = await db.collection("assembly_roles").where("assemblyId", "==", assemblyId).get();
        
        const emails = Array.from(new Set(rolesSnap.docs.map(doc => doc.data().email).filter(Boolean)));
        
        for (const email of emails) {
            const userSnap = await db.collection("users").where("email", "==", email).limit(1).get();
            if (!userSnap.empty) {
                const userId = userSnap.docs[0].id;
                await recalculateUserStaffAssemblies(email, userId);
            }
        }
    }
});
