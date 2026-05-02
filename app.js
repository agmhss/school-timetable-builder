/**
 * app.js - Advanced Auto-Generating Timetable for AGMHSS
 * Scale: LKG to 12 (Sections A-J)
 */

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbywDbC_e5uRJcYHthWEmwuxvb3c8n-QCozoN2xMQhCpIS8XHQeTpO1qpknENNRP0o4TzQ/exec";

let generatedWeeklyTimetable = [];
const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

function updateStatus(msg) {
    const indicator = document.getElementById('statusIndicator');
    if (indicator) indicator.innerText = msg;
}

document.addEventListener('DOMContentLoaded', () => {
    const viewType = document.getElementById('viewType');
    const viewFilter = document.getElementById('viewFilter');

    viewType.addEventListener('change', (e) => {
        viewFilter.innerHTML = ''; 
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

        Array.from(options).sort((a,b) => a.localeCompare(b, undefined, {numeric: true})).forEach(opt => {
            viewFilter.innerHTML += `<option value="${opt}">${opt}</option>`;
        });
    });
});

// --- CORE ALGORITHM: Smart Distribution ---
function generateAutoTimetable() {
    generatedWeeklyTimetable = []; 
    let teacherAvail = {};
    let classAvail = {};
    let dailySubjectCount = {}; // To prevent putting the same subject 3 times a day

    if (!SCHOOL_CONFIG.assignments || SCHOOL_CONFIG.assignments.length === 0) return;

    SCHOOL_CONFIG.assignments.forEach(req => {
        let placedCount = 0;

        // Distribute periods evenly across the 5 days
        for (let i = 0; i < req.periodsPerWeek; i++) {
            // This trick forces the system to check Mon, then Tue, then Wed, etc.
            let dayIndex = i % 5; 
            let startDay = daysOfWeek[dayIndex];
            
            let placedInDay = false;

            // Look for an empty slot on this specific day
            for (let period of SCHOOL_CONFIG.regularTimings) {
                if (period.type === 'break' || period.type === 'fixed') continue; 

                let timeKey = `${startDay}-${period.label}`;

                // Check if teacher is free AND class is free
                if (!teacherAvail[req.teacherName]?.[timeKey] && !classAvail[req.className]?.[timeKey]) {
                    
                    // Limit same subject to Max 2 times per day for the same class
                    let countToday = dailySubjectCount[req.className]?.[startDay]?.[req.subjectName] || 0;
                    if (countToday >= 2) continue; // Skip to next period if they already have this subject twice today

                    // Assign the period
                    generatedWeeklyTimetable.push({
                        day: startDay,
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

                    if (!dailySubjectCount[req.className]) dailySubjectCount[req.className] = {};
                    if (!dailySubjectCount[req.className][startDay]) dailySubjectCount[req.className][startDay] = {};
                    dailySubjectCount[req.className][startDay][req.subjectName] = countToday + 1;

                    placedInDay = true;
                    placedCount++;
                    break; // Move to the next required period in the week
                }
            }
            
            // Note: If a day is completely full, the strict algorithm skips that period. 
            // In a real massive school, complex fallback logic might be needed here later.
        }
    });
    
    // Sort the final table so Monday shows first, Period 1 shows first, etc.
    generatedWeeklyTimetable.sort((a, b) => {
        let dayDiff = daysOfWeek.indexOf(a.day) - daysOfWeek.indexOf(b.day);
        if (dayDiff !== 0) return dayDiff;
        return a.period.localeCompare(b.period, undefined, {numeric: true});
    });

    console.log("Smart Auto-Generation Complete!");
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

    let html = `<table id="scheduleTable" class="w-full text-left border-collapse min-w-[800px] text-sm">
        <thead class="bg-blue-100 text-blue-900">
            <tr>
                <th class="p-3 border">Day</th>
                <th class="p-3 border">Period</th>
                <th class="p-3 border">Class & Sec</th>
                <th class="p-3 border">Subject</th>
                <th class="p-3 border">Teacher</th>
            </tr>
        </thead><tbody>`;

    // Filter Data based on dropdowns
    let displayData = generatedWeeklyTimetable;
    if (viewType === 'class') {
        displayData = generatedWeeklyTimetable.filter(d => d.className === filterVal);
    } else if (viewType === 'teacher') {
        displayData = generatedWeeklyTimetable.filter(d => d.teacherName === filterVal);
    }

    // Draw Rows with alternating row colors
    displayData.forEach((slot, index) => {
        let rowColor = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
        html += `<tr class="hover:bg-blue-50 transition-colors border-b ${rowColor}">
            <td class="p-3 border font-bold text-gray-700">${slot.day}</td>
            <td class="p-3 border text-blue-800 font-semibold">${slot.period} <br><span class="text-xs text-gray-400 font-normal">${slot.time}</span></td>
            <td class="p-3 border font-black text-gray-800">${slot.className}</td>
            <td class="p-3 border font-medium text-blue-600">${slot.subjectName}</td>
            <td class="p-3 border text-gray-600">${slot.teacherName}</td>
        </tr>`;
    });

    html += `</tbody></table>`;
    mainGrid.innerHTML = html;
    updateStatus(`Showing ${viewType === 'all' ? 'All Classes' : filterVal} View`);
};

// --- CLOUD SYNC ---
window.syncFromCloud = async function() {
    updateStatus("Downloading Sheets...");
    try {
        const response = await fetch(SCRIPT_URL);
        const cloudData = await response.json();

        // Map the 5 columns from Google Sheets (A to E)
        if (cloudData.assignments && cloudData.assignments.length > 1) {
            SCHOOL_CONFIG.assignments = cloudData.assignments.slice(1).map(row => ({
                teacherName: String(row[0]).trim(),                     // Col A: Teacher
                subjectName: String(row[1]).trim(),                     // Col B: Subject
                className: String(row[2]).trim() + "-" + String(row[3]).trim(), // Col C & D: Class + Section combined
                periodsPerWeek: parseInt(row[4]) || 5                   // Col E: Periods
            }));
            
            updateStatus("Generating Schedule...");
            generateAutoTimetable(); 
            renderTimetable();       
            
        } else {
            updateStatus("No data found.");
        }
        
    } catch (error) {
        updateStatus("Sync Failed!");
        console.error("Cloud Error:", error);
    }
};

window.exportPDF = function() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    const filterType = document.getElementById('viewType').value;
    const filterVal = document.getElementById('viewFilter').value;
    let title = "AGMHSS Timetable";
    if (filterType === 'class') title += ` - Class ${filterVal}`;
    if (filterType === 'teacher') title += ` - ${filterVal}`;

    doc.text(title, 14, 15);
    doc.autoTable({ html: '#scheduleTable', startY: 20, theme: 'grid', styles: { fontSize: 8 } });
    doc.save(`AGMHSS_${filterVal || 'Master'}_Schedule.pdf`);
};
