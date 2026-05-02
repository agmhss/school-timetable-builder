/**
 * app.js - Auto-Generating Timetable for AGMHSS
 */

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbywDbC_e5uRJcYHthWEmwuxvb3c8n-QCozoN2xMQhCpIS8XHQeTpO1qpknENNRP0o4TzQ/exec";

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
            generatedWeeklyTimetable.forEach(slot => options.add(slot.className));
        } else if (e.target.value === 'teacher') {
            viewFilter.classList.remove('hidden');
            generatedWeeklyTimetable.forEach(slot => options.add(slot.teacherName));
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

    if (!SCHOOL_CONFIG.assignments || SCHOOL_CONFIG.assignments.length === 0) {
        console.warn("No data in SCHOOL_CONFIG.assignments");
        return;
    }

    // Loop through Requirements (Teacher, Subject, Class, Periods)
    SCHOOL_CONFIG.assignments.forEach(req => {
        let assignedCount = 0;

        for (let day of daysOfWeek) {
            for (let period of SCHOOL_CONFIG.regularTimings) {
                if (period.type === 'break' || period.type === 'fixed') continue; // Skip breaks
                if (assignedCount >= req.periodsPerWeek) break;

                let timeKey = `${day}-${period.label}`;

                // Check if both teacher and class are free
                if (!teacherAvail[req.teacherName]?.[timeKey] && !classAvail[req.className]?.[timeKey]) {
                    
                    // Assign them
                    generatedWeeklyTimetable.push({
                        day: day,
                        period: period.label,
                        time: `${period.start} - ${period.end}`,
                        className: req.className,
                        subjectName: req.subjectName,
                        teacherName: req.teacherName
                    });

                    // Mark as busy
                    if (!teacherAvail[req.teacherName]) teacherAvail[req.teacherName] = {};
                    teacherAvail[req.teacherName][timeKey] = true;

                    if (!classAvail[req.className]) classAvail[req.className] = {};
                    classAvail[req.className][timeKey] = true;

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
        displayData = generatedWeeklyTimetable.filter(d => d.className === filterVal);
    } else if (viewType === 'teacher') {
        displayData = generatedWeeklyTimetable.filter(d => d.teacherName === filterVal);
    }

    // Draw Rows
    displayData.forEach(slot => {
        html += `<tr class="hover:bg-gray-50 border-b">
            <td class="p-3 border font-bold text-gray-700">${slot.day}</td>
            <td class="p-3 border">${slot.period} <br><span class="text-xs text-gray-400">${slot.time}</span></td>
            <td class="p-3 border font-bold">${slot.className}</td>
            <td class="p-3 border text-blue-600">${slot.subjectName}</td>
            <td class="p-3 border">${slot.teacherName}</td>
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

        // Properly map the Google Sheet columns to readable variable names
        if (cloudData.assignments && cloudData.assignments.length > 1) {
            SCHOOL_CONFIG.assignments = cloudData.assignments.slice(1).map(row => ({
                teacherName: String(row[0]).trim(),  // Teacher Name (Col A)
                subjectName: String(row[1]).trim(),  // Subject (Col B)
                className: String(row[2]).trim(),    // Class (Col C)
                periodsPerWeek: parseInt(row[3]) || 5 // Periods (Col D)
            }));
            
            updateStatus("Generating Timetable...");
            generateAutoTimetable(); // Run the algorithm
            renderTimetable();       // Show the results
            
        } else {
            updateStatus("No assignment data found.");
        }
        
    } catch (error) {
        updateStatus("Sync Failed!");
        console.error("Cloud Error:", error);
        alert("Sync Failed! Please check if your Web App URL is correct and deployed for 'Anyone'.");
    }
};

window.exportPDF = function() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text("AGMHSS Auto-Generated Timetable", 14, 15);
    doc.autoTable({ html: '#scheduleTable', startY: 20 });
    doc.save("AGMHSS_Smart_Schedule.pdf");
};
