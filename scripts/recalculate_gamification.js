const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const path = require('path');
const fs = require('fs');

const serviceAccountPath = path.join(__dirname, '../service-account.json');
if (!fs.existsSync(serviceAccountPath)) {
    console.error("❌ Errore: Il file service-account.json non esiste.");
    process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

// Calculate user level based on XP
function calculateLevel(xp) {
    return Math.max(1, Math.floor(Math.sqrt((xp || 0) / 100)));
}

async function runRecalculation() {
    console.log("🚀 Avvio ricalcolo gamification e ripristino badge per tutti gli utenti...");

    // 1. Fetch all badges templates
    const badgesSnap = await db.collection('badges').get();
    const badgeTemplates = badgesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    console.log(`Caricati ${badgeTemplates.length} template di badge dal database.`);

    // 2. Fetch all users
    const usersSnap = await db.collection("users").get();
    console.log(`Trovati ${usersSnap.size} utenti. Elaborazione in corso...`);

    // Fetch all archived assemblies
    const assembliesSnap = await db.collection("assemblies").where("status", "==", "ARCHIVIATA").get();
    const archivedAssemblies = new Set(assembliesSnap.docs.map(doc => doc.id));

    // Fetch all assembly roles and group by email
    const rolesSnap = await db.collection("assembly_roles").get();
    const rolesByEmail = new Map();
    rolesSnap.docs.forEach(docSnap => {
        const rData = docSnap.data();
        const rEmail = rData.email?.toLowerCase().trim();
        if (rEmail) {
            if (!rolesByEmail.has(rEmail)) {
                rolesByEmail.set(rEmail, []);
            }
            rolesByEmail.get(rEmail).push(rData);
        }
    });

    let updatedUsersCount = 0;
    let totalAwardedCount = 0;

    for (const userDoc of usersSnap.docs) {
        const userId = userDoc.id;
        const userData = userDoc.data();
        const email = userData.email?.toLowerCase();
        if (!email) continue;

        // Recalculate friendCount from friends array
        const friendsList = userData.friends || [];
        const correctFriendCount = friendsList.length;

        const RARITY_XP = {
            'COMMON': 100,
            'UNCOMMON': 200,
            'RARE': 400,
            'EPIC': 800,
            'LEGENDARY': 1500
        };

        // Fetch all student documents for this user across all assemblies
        const studentDocs = await db.collection("students").where("email", "==", email).get();
        let actualCheckIns = 0;
        let actualAssemblies = 0;
        let fullAttendanceCount = 0;

        studentDocs.forEach(docSnap => {
            const sData = docSnap.data();
            const actualLocation = sData.actual_location || {};
            const checkedInTurns = Object.values(actualLocation).filter(loc => loc && loc.checked_in === true && loc.activity_id !== 'STAFF').length;
            actualCheckIns += checkedInTurns;
            if (checkedInTurns > 0) {
                actualAssemblies++;
            }
            if (checkedInTurns === 3) {
                fullAttendanceCount++;
            }
        });

        const currentTotalCheckIns = userData.totalCheckIns || 0;
        const dailyCheckIns = Math.max(0, currentTotalCheckIns - actualCheckIns);

        let badgeXp = 0;
        const earnedBadges = userData.earnedBadges || [];
        earnedBadges.forEach(eb => {
            const template = badgeTemplates.find(t => t.id === eb.badgeId);
            if (template) {
                const rarity = template.rarity || 'COMMON';
                badgeXp += RARITY_XP[rarity] || 50;
            }
        });

        // Calculate staff assemblies and XP dynamically based on roles
        const userRoles = rolesByEmail.get(email) || [];
        const uniqueAssemblies = new Set();
        const assemblyToRoles = {};

        userRoles.forEach(r => {
            if (r.assemblyId && ['SECURITY', 'ROOM_MANAGER'].includes(r.role) && archivedAssemblies.has(r.assemblyId)) {
                uniqueAssemblies.add(r.assemblyId);
                if (!assemblyToRoles[r.assemblyId]) {
                    assemblyToRoles[r.assemblyId] = [];
                }
                assemblyToRoles[r.assemblyId].push(r.role);
            }
        });

        const staffAssembliesCount = uniqueAssemblies.size;
        const staffAssemblies = Array.from(uniqueAssemblies);

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

        const newXP = (dailyCheckIns * 3) + (actualCheckIns * 250) + (fullAttendanceCount * 250) + staffXp + badgeXp;
        const newLevel = calculateLevel(newXP);

        const currentXP = userData.xp || 0;
        const currentLevel = userData.level || 1;
        const currentFriendCount = userData.friendCount || 0;
        const currentAssemblies = userData.totalAssemblies || 0;

        const currentStaffAssemblies = userData.staffAssemblies || [];
        const currentStaffCount = userData.staffAssembliesCount || 0;
        const currentStaffXp = userData.staffXp || 0;

        const hasStaffChanges = staffAssembliesCount !== currentStaffCount ||
                               currentStaffXp !== staffXp ||
                               JSON.stringify(staffAssemblies.sort()) !== JSON.stringify([...currentStaffAssemblies].sort());

        const hasChanges = newXP !== currentXP || 
                           newLevel !== currentLevel || 
                           correctFriendCount !== currentFriendCount || 
                           (actualCheckIns + dailyCheckIns) !== currentTotalCheckIns || 
                           actualAssemblies !== currentAssemblies ||
                           hasStaffChanges;

        let latestUserData = { ...userData };
        let hasChangesLogged = false;

        if (hasChanges) {
            const updates = {
                totalCheckIns: actualCheckIns + dailyCheckIns,
                totalAssemblies: actualAssemblies,
                friendCount: correctFriendCount,
                xp: newXP,
                level: newLevel,
                staffAssemblies,
                staffAssembliesCount,
                staffXp
            };

            await db.collection("users").doc(userId).update(updates);
            latestUserData = { ...latestUserData, ...updates };
            hasChangesLogged = true;
            console.log(`📈 Aggiornate statistiche per ${email}: XP=${newXP}, Amici=${correctFriendCount}, CheckIn=${actualCheckIns + dailyCheckIns}`);
        }

        // --- BADGE EVALUATION AND RESTORATION ---
        const earnedIds = new Set((latestUserData.earnedBadges || []).map(eb => eb.badgeId));
        const unearnedTemplates = badgeTemplates.filter(t => !earnedIds.has(t.id));

        const badgesToAward = [];

        for (const badge of unearnedTemplates) {
            if (!badge.criteria || badge.criteria.type === 'MANUAL') continue;

            const { type, value = 0 } = badge.criteria;
            let meetsCriteria = false;

            switch (type) {
                case 'XP_THRESHOLD':
                    meetsCriteria = (latestUserData.xp || 0) >= value;
                    break;
                case 'ASSEMBLY_COUNT':
                    meetsCriteria = (latestUserData.totalAssemblies || 0) >= value;
                    break;
                case 'STREAK':
                    meetsCriteria = (latestUserData.streak || 0) >= value;
                    break;
                case 'FRIEND_COUNT':
                    meetsCriteria = (latestUserData.friendCount || 0) >= value;
                    break;
                case 'CHECKIN_COUNT':
                    meetsCriteria = (latestUserData.totalCheckIns || 0) >= value;
                    break;
                case 'SECURITY_INSPECTIONS':
                    meetsCriteria = (latestUserData.securityInspections || 0) >= value;
                    break;
                case 'STAFF_ASSEMBLIES_COUNT':
                    meetsCriteria = (latestUserData.staffAssembliesCount || 0) >= value;
                    break;
                default:
                    break;
            }

            if (meetsCriteria) {
                badgesToAward.push(badge);
            }
        }

        if (badgesToAward.length > 0) {
            const userRef = db.collection("users").doc(userId);
            let userAwardedCount = 0;

            await db.runTransaction(async (tx) => {
                const userSnap = await tx.get(userRef);
                if (!userSnap.exists) return;
                const uData = userSnap.data();

                const currentEarned = uData.earnedBadges || [];
                const newEarnedBadges = [];
                const badgeRefsToUpdate = new Map();

                for (const badge of badgesToAward) {
                    if (currentEarned.some(eb => eb.badgeId === badge.id) || newEarnedBadges.some(eb => eb.badgeId === badge.id)) {
                        continue;
                    }

                    const badgeRef = db.collection("badges").doc(badge.id);
                    const badgeSnap = await tx.get(badgeRef);
                    if (!badgeSnap.exists) continue;

                    const bData = badgeSnap.data();
                    if (bData.maxSupply && (bData.currentSupply || 0) >= bData.maxSupply) {
                        continue;
                    }

                    newEarnedBadges.push({
                        badgeId: badge.id,
                        awardedAt: Date.now(),
                        awardedBy: 'system_recalc',
                        customMessage: `Ripristinato/Assegnato tramite ricalcolo automatico: ${badge.name}`
                    });

                    badgeRefsToUpdate.set(badge.id, (bData.currentSupply || 0) + 1);
                }

                if (newEarnedBadges.length > 0) {
                    tx.update(userRef, {
                        earnedBadges: FieldValue.arrayUnion(...newEarnedBadges)
                    });

                    for (const [badgeId, newSupply] of badgeRefsToUpdate.entries()) {
                        tx.update(db.collection("badges").doc(badgeId), {
                            currentSupply: newSupply
                        });
                    }
                    userAwardedCount = newEarnedBadges.length;
                }
            });

            if (userAwardedCount > 0) {
                totalAwardedCount += userAwardedCount;
                console.log(`🏆 Ripristinati/Assegnati ${userAwardedCount} badge a ${email}.`);
            }
        }

        if (hasChanges || badgesToAward.length > 0) {
            updatedUsersCount++;
        }
    }

    console.log(`\n✅ Ricalcolo completato!`);
    console.log(`- Utenti aggiornati/elaborati: ${updatedUsersCount}`);
    console.log(`- Badge ripristinati/assegnati: ${totalAwardedCount}`);
}

runRecalculation().catch(err => {
    console.error("❌ Errore durante l'esecuzione del ricalcolo:", err);
});
