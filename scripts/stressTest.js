import admin from 'firebase-admin';
import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serviceAccountPath = join(__dirname, '..', 'service-account.json');

const isEmulator = !!process.env.FIRESTORE_EMULATOR_HOST;

if (isEmulator) {
    console.log(`🔌 Connecting to Firestore Emulator at ${process.env.FIRESTORE_EMULATOR_HOST}`);
    if (!admin.apps.length) {
        admin.initializeApp({
            projectId: 'mga-assembly-manager'
        });
    }
} else {
    if (existsSync(serviceAccountPath)) {
        const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        }
    } else {
        console.error(`❌ Error: service-account.json not found at ${serviceAccountPath} and FIRESTORE_EMULATOR_HOST is not set.`);
        process.exit(1);
    }
}

const db = admin.firestore();

// Argument Parsing
const args = process.argv.slice(2);
const hasFlag = (flag) => args.includes(flag);
const getFlagValue = (flag) => {
    const idx = args.indexOf(flag);
    if (idx !== -1 && idx + 1 < args.length) {
        return args[idx + 1];
    }
    return null;
};

let action = null;
let value = null;

if (hasFlag('--generate')) {
    action = 'generate';
    value = parseInt(getFlagValue('--generate')) || 1000;
} else if (hasFlag('--simulate')) {
    action = 'simulate';
    value = parseInt(getFlagValue('--simulate')) || 50; // Concurrency limit
} else if (hasFlag('--cleanup')) {
    action = 'cleanup';
} else if (hasFlag('--run')) {
    action = 'run';
    value = parseInt(getFlagValue('--run')) || 1000;
}

if (!action) {
    console.log(`
eversia STRESS TEST & CLEANUP HARNESS

Usage:
  node scripts/stressTest.js --generate <count>   - Generate mock students in Firestore
  node scripts/stressTest.js --simulate <concur>  - Run concurrent check-in simulations
  node scripts/stressTest.js --cleanup            - Safely delete mock data and sync counts
  node scripts/stressTest.js --run <count>        - Generate, Simulate and Cleanup automatically

Options:
  --generate [1000]   Number of mock students to generate
  --simulate [50]     Concurrency limit for check-in simulation
  --run [1000]        Number of students for auto run (generate -> simulate -> cleanup)
`);
    process.exit(0);
}

async function getActiveAssembly() {
    const configDoc = await db.collection('config').doc('main').get();
    let assemblyId = configDoc.exists ? configDoc.data().activeAssemblyId : null;

    if (!assemblyId) {
        const assemblies = await db.collection('assemblies').limit(1).get();
        if (!assemblies.empty) {
            assemblyId = assemblies.docs[0].id;
        } else {
            throw new Error('No assemblies found in database.');
        }
    }
    return assemblyId;
}

async function generateMockStudents(assemblyId, totalCount) {
    console.log('🚀 Starting Stress Test Data Generation...');
    console.log(`📍 Target Assembly ID: ${assemblyId}`);

    // Get Rooms (up to 40)
    const roomsSnap = await db.collection('rooms')
        .where('assemblyId', '==', assemblyId)
        .limit(40)
        .get();
    
    const roomIds = roomsSnap.docs.map(d => d.id);
    if (roomIds.length === 0) {
        throw new Error(`No rooms found for assembly ${assemblyId}. Cannot distribute students.`);
    }
    console.log(`🏫 Found ${roomIds.length} rooms to distribute students.`);

    const firstNames = ['Marco', 'Giulia', 'Alessandro', 'Sofia', 'Lorenzo', 'Aurora', 'Mattia', 'Alice', 'Leonardo', 'Emma', 'Riccardo', 'Beatrice', 'Tommaso', 'Giorgia', 'Gabriele', 'Martina', 'Edoardo', 'Vittoria', 'Matteo', 'Camilla'];
    const lastNames = ['Rossi', 'Ferrari', 'Russo', 'Bianchi', 'Esposito', 'Colombo', 'Romano', 'Ricci', 'Marino', 'Greco', 'Bruno', 'Gallo', 'Conti', 'De Luca', 'Costa', 'Giordano', 'Mancini', 'Rizzo', 'Lombardi', 'Moretti'];

    console.log(`👥 Generating ${totalCount} students...`);
    const batchSize = 500;
    let count = 0;

    const roomBookingCounts = {};
    roomIds.forEach(rid => {
        roomBookingCounts[rid] = { '1': 0, '2': 0, '3': 0 };
    });

    const startTime = Date.now();

    for (let i = 0; i < totalCount; i += batchSize) {
        const batch = db.batch();
        const end = Math.min(i + batchSize, totalCount);

        for (let j = i; j < end; j++) {
            const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
            const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
            const email = `mock.student.${j}@liceoagnesi.edu.it`;
            const studentId = `mock_student_${j}_${assemblyId}`;
            const studentRef = db.collection('students').doc(studentId);

            // Randomly assign to rooms for Turns 1, 2, 3
            const scheduledTurns = {
                '1': roomIds[Math.floor(Math.random() * roomIds.length)],
                '2': roomIds[Math.floor(Math.random() * roomIds.length)],
                '3': roomIds[Math.floor(Math.random() * roomIds.length)]
            };

            // Increment local counters
            Object.entries(scheduledTurns).forEach(([tid, rid]) => {
                if (roomBookingCounts[rid]) {
                    roomBookingCounts[rid][tid]++;
                }
            });

            batch.set(studentRef, {
                firstName,
                lastName,
                email,
                assemblyId,
                scheduled_turns: scheduledTurns,
                actual_location: {},
                isMock: true,
                createdAt: Date.now()
            });
            count++;
        }

        await batch.commit();
        console.log(`   Progress: ${count}/${totalCount} students...`);
    }

    const duration = (Date.now() - startTime) / 1000;
    console.log(`✅ Generated ${count} students in ${duration.toFixed(2)}s (${(count / duration).toFixed(1)} writes/sec).`);

    console.log('📈 Incrementing room booking counts...');
    const roomBatch = db.batch();
    let roomBatchOps = 0;
    for (const [rid, turnsObj] of Object.entries(roomBookingCounts)) {
        const roomRef = db.collection('rooms').doc(rid);
        const updateData = {};
        Object.entries(turnsObj).forEach(([tid, val]) => {
            if (val > 0) {
                updateData[`counts_by_turn.${tid}`] = admin.firestore.FieldValue.increment(val);
            }
        });

        if (Object.keys(updateData).length > 0) {
            roomBatch.update(roomRef, updateData);
            roomBatchOps++;
        }
    }

    if (roomBatchOps > 0) {
        await roomBatch.commit();
        console.log('✅ Room counts updated.');
    }
}

async function simulateCheckIn(student, turnId) {
    const studentRef = db.collection('students').doc(student.id);
    const roomId = student.scheduled_turns[turnId];
    if (!roomId) return { success: false, error: 'No room assigned for turn' };

    const roomRef = db.collection('rooms').doc(roomId);
    const eventLogRef = db.collection('event_log').doc();

    const startTime = Date.now();

    try {
        await db.runTransaction(async (transaction) => {
            const studentSnap = await transaction.get(studentRef);
            const roomSnap = await transaction.get(roomRef);

            if (!studentSnap.exists || !roomSnap.exists) {
                throw new Error('Student or Room document does not exist.');
            }

            const studentData = studentSnap.data();
            const roomData = roomSnap.data();

            const isAlreadyCheckedIn = studentData.actual_location?.[turnId]?.checked_in &&
                                       studentData.actual_location[turnId].activity_id === roomId;

            if (isAlreadyCheckedIn) {
                return;
            }

            const currentTurnCount = roomData.counts_by_turn?.[turnId] || 0;

            transaction.update(studentRef, {
                [`actual_location.${turnId}`]: {
                    activity_id: roomId,
                    checked_in: true,
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    markedBy: 'Stress Test Simulator',
                    markedAt: new Date().toISOString()
                }
            });

            transaction.update(roomRef, {
                [`counts_by_turn.${turnId}`]: currentTurnCount + 1
            });

            transaction.set(eventLogRef, {
                assemblyId: studentData.assemblyId,
                type: 'CHECK_IN',
                studentName: `${studentData.firstName} ${studentData.lastName}`,
                studentEmail: studentData.email,
                activityName: roomData.name,
                activityId: roomId,
                turnId,
                markedBy: 'Stress Test Simulator',
                timestamp: Date.now()
            });
        });

        const latency = Date.now() - startTime;
        return { success: true, latency };
    } catch (err) {
        const latency = Date.now() - startTime;
        return { success: false, latency, error: err.message };
    }
}

async function runSimulations(concurrency, totalRequests = 200) {
    console.log('⚡ Fetching mock students for simulation...');
    const studentsSnap = await db.collection('students')
        .where('isMock', '==', true)
        .limit(1000)
        .get();

    const mockStudents = studentsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (mockStudents.length === 0) {
        throw new Error('No mock students found. Please run --generate first.');
    }

    console.log(`⚡ Running simulation: ${totalRequests} check-ins with concurrency limit of ${concurrency}...`);
    
    let activeCount = 0;
    let completedCount = 0;
    let index = 0;
    const results = [];

    const startTime = Date.now();

    const resultsPromise = new Promise((resolve) => {
        function next() {
            if (completedCount === totalRequests) {
                resolve(results);
                return;
            }

            while (activeCount < concurrency && index < totalRequests) {
                const currentIdx = index++;
                const student = mockStudents[Math.floor(Math.random() * mockStudents.length)];
                const turnId = ['1', '2', '3'][Math.floor(Math.random() * 3)];
                
                activeCount++;
                simulateCheckIn(student, turnId).then((res) => {
                    results.push(res);
                    activeCount--;
                    completedCount++;
                    next();
                });
            }
        }
        next();
    });

    const runResults = await resultsPromise;
    const totalDuration = (Date.now() - startTime) / 1000;

    const successes = runResults.filter(r => r.success);
    const failures = runResults.filter(r => !r.success);

    const latencies = successes.map(r => r.latency);
    const avgLatency = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;
    const minLatency = latencies.length > 0 ? Math.min(...latencies) : 0;
    const maxLatency = latencies.length > 0 ? Math.max(...latencies) : 0;

    console.log('\n📊 STRESS TEST SIMULATION REPORT');
    console.log('--------------------------------------------------');
    console.log(`⏱️  Total Duration:     ${totalDuration.toFixed(2)}s`);
    console.log(`📈 Throughput:         ${(totalRequests / totalDuration).toFixed(1)} transactions/sec`);
    console.log(`✅ Success Rate:        ${((successes.length / totalRequests) * 100).toFixed(1)}% (${successes.length}/${totalRequests})`);
    console.log(`❌ Failure Rate:        ${((failures.length / totalRequests) * 100).toFixed(1)}% (${failures.length}/${totalRequests})`);
    console.log(`⚡ Avg Latency:        ${avgLatency.toFixed(1)} ms`);
    console.log(`🏎️  Min Latency:        ${minLatency} ms`);
    console.log(`🐢 Max Latency:        ${maxLatency} ms`);
    
    if (failures.length > 0) {
        console.log('\n❌ Failure reasons distribution:');
        const errorsMap = {};
        failures.forEach(f => {
            errorsMap[f.error] = (errorsMap[f.error] || 0) + 1;
        });
        Object.entries(errorsMap).forEach(([err, count]) => {
            console.log(`  - "${err}": ${count} occurrences`);
        });
    }
    console.log('--------------------------------------------------\n');
}

async function cleanupMockData(assemblyId) {
    console.log('🧹 Starting Database Cleanup...');
    console.log(`📍 Target Assembly ID: ${assemblyId}`);

    // 1. Delete Event Logs
    console.log('   Deleting mock event logs...');
    const eventLogsSnap = await db.collection('event_log')
        .where('markedBy', '==', 'Stress Test Simulator')
        .get();

    if (!eventLogsSnap.empty) {
        const batch = db.batch();
        eventLogsSnap.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        console.log(`   Deleted ${eventLogsSnap.size} event logs.`);
    } else {
        console.log('   No mock event logs found.');
    }

    // 2. Delete Students
    console.log('   Deleting mock student documents...');
    let totalDeleted = 0;
    while (true) {
        const studentsSnap = await db.collection('students')
            .where('isMock', '==', true)
            .limit(500)
            .get();

        if (studentsSnap.empty) {
            break;
        }

        const batch = db.batch();
        studentsSnap.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        totalDeleted += studentsSnap.size;
        console.log(`   Deleted ${totalDeleted} mock students...`);
    }

    console.log(`✅ Deleted total of ${totalDeleted} mock students.`);

    // 3. Recalculate Room Counts
    console.log('🔄 Re-synchronizing room counts...');
    const roomsSnap = await db.collection('rooms')
        .where('assemblyId', '==', assemblyId)
        .get();
    const rooms = roomsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const actualStudentsSnap = await db.collection('students')
        .where('assemblyId', '==', assemblyId)
        .get();
    
    // Filter out mock students just in case any remains
    const actualStudents = actualStudentsSnap.docs
        .map(d => d.data())
        .filter(s => !s.isMock && !s.id?.startsWith('mock_student_'));

    console.log(`ℹ️  Re-synchronizing based on ${actualStudents.length} real students remaining.`);

    const countBatch = db.batch();
    let countBatchOps = 0;

    for (const room of rooms) {
        const expectedCounts = {};
        (room.turn_ids || ['1', '2', '3']).forEach(t => {
            expectedCounts[t] = 0;
        });

        actualStudents.forEach(student => {
            Object.entries(student.scheduled_turns || {}).forEach(([tid, rid]) => {
                if (rid === room.id) {
                    expectedCounts[tid] = (expectedCounts[tid] || 0) + 1;
                }
            });
        });

        const currentCounts = room.counts_by_turn || {};
        const needsUpdate = Object.keys(expectedCounts).some(
            t => expectedCounts[t] !== currentCounts[t]
        );

        if (needsUpdate) {
            countBatch.update(db.collection('rooms').doc(room.id), {
                counts_by_turn: expectedCounts
            });
            countBatchOps++;
        }
    }

    if (countBatchOps > 0) {
        await countBatch.commit();
        console.log(`✅ Re-synchronized counts for ${countBatchOps} rooms.`);
    } else {
        console.log('✅ All room counts are already clean and in sync.');
    }

    console.log('✨ Database cleanup complete!');
}

async function run() {
    try {
        const assemblyId = await getActiveAssembly();
        
        if (action === 'generate') {
            await generateMockStudents(assemblyId, value);
        } else if (action === 'simulate') {
            await runSimulations(value);
        } else if (action === 'cleanup') {
            await cleanupMockData(assemblyId);
        } else if (action === 'run') {
            console.log(`🏁 Starting AUTO-RUN stress test sequence: generate (${value}) -> simulate -> cleanup`);
            await generateMockStudents(assemblyId, value);
            // Simulate checkins: concurrency 50, requests 300
            await runSimulations(50, 300);
            await cleanupMockData(assemblyId);
            console.log('🏁 Auto-run sequence completed successfully!');
        }
        process.exit(0);
    } catch (err) {
        console.error('❌ Error executing stress test action:', err);
        process.exit(1);
    }
}

// Security Check if not emulator
if (!isEmulator) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    console.warn('\n⚠️  SECURITY WARNING: Running this script on PRODUCTION Firestore!');
    console.warn('   Make sure you know what you are doing.');
    console.warn(`   Target Action: ${action.toUpperCase()} ${value ? `(${value})` : ''}\n`);
    
    rl.question('Type CONFIRM_PRODUCTION to proceed: ', (answer) => {
        rl.close();
        if (answer.trim() !== 'CONFIRM_PRODUCTION') {
            console.log('❌ Operation cancelled.');
            process.exit(0);
        }
        run();
    });
} else {
    run();
}
