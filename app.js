/**
 * app.js - Optimized for AGMHSS Patteeswaram
 */

// Define global state so all functions can access them
let currentSession = 'FN';
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzTprXjKJsf64AVfEQpynXjvv1GcSf6l9pQympFih8MoS557wxKxZg3KmSWhyB9kPcRkg/exec";

function updateStatus(msg) {
    const indicator = document.getElementById('statusIndicator');
    if (indicator) indicator.innerText = msg;
}

document.addEventListener('DOMContentLoaded', () => {
    const opModeSelect = document.getElementById('opMode');
    const sessionBtns = document.querySelectorAll('#btnFN, #btnAN');
    const mainGrid = document.getElementById('mainGrid');

    // 1. Handle Session Toggling
    sessionBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            sessionBtns.forEach(b => b.classList.remove('bg-white', 'shadow-sm', 'text-blue-700', 'font-bold'));
            sessionBtns.forEach(b => b.classList.add('text-gray-500', 'hover:bg-gray-200'));
            
            e.target.classList.remove('text-gray-500', 'hover:bg-gray-200');
            e.target.classList.add('bg-white', 'shadow-sm', 'text-blue-700', 'font-bold');
            
            currentSession = e.target.id.replace('btn', '');
            updateStatus(`Switched to ${currentSession} Session`);
        });
    });

    // 2. Rendering Engines
    window.generateGrid = function() {
        const mode = opModeSelect.value;
        mainGrid.innerHTML = ''; 

        if (mode === 'regular') {
            renderRegularTimetable();
        } else {
            renderExamSchedule();
        }
    };

    function renderRegularTimetable() {
    let html = `
        <table id="scheduleTable" class="w-full text-left border-collapse">
            <thead class="bg-gray-100">
                <tr>
                    <th class="p-3 border">Period</th>
                    <th class="p-3 border">Timing</th>
                    <th class="p-3 border">Class & Subject</th>
                    <th class="p-3 border">Teacher</th>
                </tr>
            </thead>
            <tbody>`;

    SCHOOL_CONFIG.regularTimings.forEach(slot => {
        // Find assignment for this specific period
        const assignment = SCHOOL_CONFIG.assignments.find(a => a.period === slot.label) || { class: "-", subject: "-", teacher: "-" };

        html += `
            <tr class="hover:bg-blue-50 transition-colors">
                <td class="p-3 border font-semibold text-blue-700">${slot.label}</td>
                <td class="p-3 border text-sm">${slot.start} - ${slot.end}</td>
                <td class="p-3 border">
                    <div class="font-bold text-gray-800">${assignment.class}</div>
                    <div class="text-xs text-blue-600">${assignment.subject}</div>
                </td>
                <td class="p-3 border text-sm font-medium text-gray-700">
                    ${slot.type === 'break' ? '—' : assignment.teacher}
                </td>
            </tr>`;
    });

    html += `</tbody></table>`;
    mainGrid.innerHTML = html;
    updateStatus("Regular Schedule with Assignments Loaded");
    }

    function renderExamSchedule() {
    const pattern = document.getElementById('patternSelect').value;
    const activeGrades = SCHOOL_CONFIG.examPatterns[pattern][currentSession];
    const examData = SCHOOL_CONFIG.examSettings[currentSession];

    let html = `<div id="examContainer" class="space-y-4">
        <div class="p-4 bg-orange-50 border-l-4 border-orange-400 font-bold text-orange-800">
            Session: ${currentSession} | Reading: ${examData.coolOffStart}-${examData.writingStart}
        </div><div class="grid grid-cols-1 md:grid-cols-2 gap-4">`;

    activeGrades.forEach(grade => {
        const finishTime = Utils.getExamEndTime(grade, currentSession);
        // Placeholder for duty logic
        const dutyTeacher = SCHOOL_CONFIG.teachers[grade % SCHOOL_CONFIG.teachers.length].name; 

        html += `
            <div class="p-4 border rounded-lg bg-white shadow-sm hover:border-blue-500 transition-all">
                <div class="flex justify-between items-start mb-2">
                    <h4 class="text-xl font-bold text-blue-800">Class ${grade}</h4>
                    <span class="bg-blue-100 text-blue-700 text-[10px] px-2 py-1 rounded font-bold uppercase">Hall Assigned</span>
                </div>
                <div class="space-y-1 mb-3">
                    <p class="text-gray-600 text-sm">Ends: <span class="font-bold text-blue-600">${finishTime}</span></p>
                    <p class="text-xs text-gray-400">Duration: ${grade <= 8 ? '2.5 Hours' : '3 Hours'}</p>
                </div>
                <div class="pt-2 border-t border-gray-100">
                    <p class="text-xs font-semibold text-gray-500 uppercase">Invigilator</p>
                    <p class="text-sm font-bold text-gray-800">${dutyTeacher}</p>
                </div>
            </div>`;
    });

    html += `</div></div>`;
    mainGrid.innerHTML = html;
    }

// 3. Cloud & Export Functions (Global Scope)
async function syncFromCloud() {
    updateStatus("Syncing with Google Sheets...");
    try {
        const response = await fetch(SCRIPT_URL);
        const cloudData = await response.json();
        SCHOOL_CONFIG.teachers = cloudData.slice(1).map(row => ({ id: row[0], name: row[1], dept: row[2] }));
        updateStatus("Cloud Sync Complete");
        if(window.generateGrid) window.generateGrid();
    } catch (error) {
        updateStatus("Sync Failed: Check Script URL");
    }
}

async function saveToCloud() {
    const payload = {
        mode: document.getElementById('opMode').value,
        session: currentSession,
        timestamp: new Date().toISOString()
    };
    try {
        // Using 'no-cors' mode as Apps Script doesn't always handle Preflight well
        await fetch(SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
        alert("Request sent to Google Sheets!");
    } catch (e) {
        alert("Error saving data.");
    }
}

window.exportPDF = function() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text("AGMHSS Patteeswaram Timetable", 14, 15);
    
    // Check if table exists (Regular Mode) or just print text (Exam Mode)
    const table = document.getElementById('scheduleTable');
    if (table) {
        doc.autoTable({ html: '#scheduleTable', startY: 20 });
    } else {
        doc.text("Current Session: " + currentSession, 14, 25);
        doc.text("Please use Regular Mode for detailed table exports.", 14, 35);
    }
    doc.save("AGMHSS_Schedule.pdf");
};
