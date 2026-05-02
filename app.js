/**
 * app.js - Auto-Generating Timetable for AGMHSS
 */

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyK4PLNHmAhp1C73fxTyr41sd-jEPXz1welPexofY2Ellx4YCmlMffCb4HkHPXwxlpxMg/exec";

// Global Variable to store the auto-generated weekly timetable
let generatedWeeklyTimetable = [];
const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

function updateStatus(msg) {
    const indicator = document.getElementById('statusIndicator');
    if (indicator) indicator.innerText = msg;
}

document.addEventListener('DOMContentLoaded', () => {
    // Setup UI listeners for the new dropdowns
    const viewType = document.getElementById('viewType');
    const viewFilter = document.getElementById('viewFilter');

    viewType.addEventListener('change', (e) => {
        viewFilter.innerHTML = ''; // Clear old options
        let options = new Set();

        if (e.target.value === 'class') {
            viewFilter.classList.remove('hidden');
            generatedWeeklyTimetable.forEach(slot => options.add(slot.classId));
        } else if (e.target.value === 'teacher') {
            viewFilter.classList.remove('hidden');
            generatedWeeklyTimetable.forEach(slot => options.add(slot.teacher));
        } else {
            viewFilter.classList.add('hidden');
        }

        // Add unique options to dropdown
        Array.from(options).sort().forEach(opt => {
            viewFilter.innerHTML += `<option value="${opt}">${opt}</option>`;
        });
    });
});

// --- CORE ALGORITHM: Auto Generate Timetable ---
function generateAutoTimetable() {
    generatedWeeklyTimetable = []; // Reset
    let teacherAvail = {};
    let classAvail = {};

    if (!SCHOOL_CONFIG.assignments || SCHOOL_CONFIG.assignments.length === 0) return;

    // Loop through Requirements (Teacher, Subject, Class, Periods)
    SCHOOL_CONFIG.assignments.forEach(req => {
        let assignedCount = 0;
        let classId = req.class; // e.g., "10-A"
        let targetPeriods = parseInt(req.teacher) || 5; // Using 4th column for Periods count

        for (let day of daysOfWeek) {
            for (let period of SCHOOL_CONFIG.regularTimings) {
                if (period.type === 'break' || period.type === 'fixed') continue; // Skip breaks
                if (assignedCount >= targetPeriods) break;

                let timeKey = `${day}-${period.label}`;

                // Check if both teacher and class are free
                if (!teacherAvail[req.subject]?.[timeKey] && !classAvail[classId]?.[timeKey]) {
                    
                    // Assign them
                    generatedWeeklyTimetable.push({
                        day: day,
                        period: period.label,
                        time: `${period.start} - ${period.end}`,
                        classId: classId,
                        subject: req.class, // Re-mapped based on sheet
                        teacher: req.subject // Re-mapped based on sheet
                    });

                    // Mark as busy
                    if (!teacherAvail[req.subject]) teacherAvail[req.subject] = {};
                    teacherAvail[req.subject][timeKey] = true;

                    if (!classAvail[classId]) classAvail[classId] = {};
                    classAvail[classId][timeKey] = true;

                    assignedCount++;
                }
            }
        }
    });
    console.log("Auto-Generation Complete!");
}

// --- RENDER ENGINE ---
window.renderTimetable = function() {
    const mainGrid = document.getElementById('mainGrid');
    const viewType = document.getElementById('viewType').value;
    const filterVal = document.getElementById('viewFilter').value;

    if (generatedWeeklyTimetable.length === 0) {
        mainGrid.innerHTML = `<div class="text-red-500 font-bold p-4">No data generated. Click Sync Data first!</div>`;
        return;
    }

    let html = `<table id="scheduleTable" class="w-full text-left border-collapse min-w-[800px]">
        <thead class="bg-blue-100 text-blue-900">
            <tr>
                <th class="p-3 border">Day</th>
                <th class="p-3 border">Period</th>
                <th class="p-3 border">Class</th>
                <th class="p-3 border">Subject</th>
                <th class="p-3 border">Teacher</th>
            </tr>
        </thead><tbody>`;

    // Filter Data based on selection
    let displayData = generatedWeeklyTimetable;
    if (viewType === 'class') {
        displayData = generatedWeeklyTimetable.filter(d => d.classId === filterVal);
    } else if (viewType === 'teacher') {
        displayData = generatedWeeklyTimetable.filter(d => d.teacher === filterVal);
    }

    // Draw Rows
    displayData.forEach(slot => {
        html += `<tr class="hover:bg-gray-50 border-b">
            <td class="p-3 border font-bold text-gray-700">${slot.day}</td>
            <td class="p-3 border">${slot.period} <br><span class="text-xs text-gray-400">${slot.time}</span></td>
            <td class="p-3 border font-bold">${slot.classId}</td>
            <td class="p-3 border text-blue-600">${slot.subject}</td>
            <td class="p-3 border">${slot.teacher}</td>
        </tr>`;
    });

    html += `</tbody></table>`;
    mainGrid.innerHTML = html;
    updateStatus(`Showing ${viewType} view`);
};

// --- CLOUD SYNC ---
window.syncFromCloud = async function() {
    updateStatus("Downloading Requirements...");
    try {
        const response = await fetch(SCRIPT_URL);
        const cloudData = await response.json();

        // Load the requirements from the 2nd sheet into SCHOOL_CONFIG
        if (cloudData.assignments && cloudData.assignments.length > 1) {
            SCHOOL_CONFIG.assignments = cloudData.assignments.slice(1).map(row => ({
                subject: String(row[0]).trim(), // Teacher Name (Mapped to col 1)
                class: String(row[1]).trim(),   // Subject (Mapped to col 2)
                classId: String(row[2]).trim(), // Class (Mapped to col 3)
                teacher: parseInt(row[3]) || 5  // Periods (Mapped to col 4)
            }));
        }

        updateStatus("Generating Timetable...");
        generateAutoTimetable(); // Run the algorithm
        renderTimetable();       // Show the results
        
    } catch (error) {
        updateStatus("Sync Failed!");
        console.error("Cloud Error:", error);
    }
};

window.exportPDF = function() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text("AGMHSS Auto-Generated Timetable", 14, 15);
    doc.autoTable({ html: '#scheduleTable', startY: 20 });
    doc.save("AGMHSS_Smart_Schedule.pdf");
};
