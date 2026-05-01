/**
 * app.js
 * Main Controller for AGMHSS Timetable Engine
 */

document.addEventListener('DOMContentLoaded', () => {
    const opModeSelect = document.getElementById('opMode');
    const sessionBtns = document.querySelectorAll('#btnFN, #btnAN');
    const mainGrid = document.getElementById('mainGrid');
    
    let currentSession = 'FN';

    // 1. Handle Session Toggling (FN/AN)
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

    // 2. The Rendering Engine
    window.generateGrid = function() {
        const mode = opModeSelect.value;
        mainGrid.innerHTML = ''; // Clear previous content

        if (mode === 'regular') {
            renderRegularTimetable();
        } else {
            renderExamSchedule();
        }
    };

    function renderRegularTimetable() {
        let html = `
            <table class="w-full text-left border-collapse">
                <thead class="bg-gray-100">
                    <tr>
                        <th class="p-3 border">Period</th>
                        <th class="p-3 border">Timing</th>
                        <th class="p-3 border">Type</th>
                    </tr>
                </thead>
                <tbody>`;

        SCHOOL_CONFIG.regularTimings.forEach(slot => {
            html += `
                <tr class="hover:bg-blue-50 transition-colors">
                    <td class="p-3 border font-semibold text-blue-700">${slot.label}</td>
                    <td class="p-3 border">${slot.start} - ${slot.end}</td>
                    <td class="p-3 border">
                        <span class="px-2 py-1 rounded-full text-xs ${slot.type === 'break' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}">
                            ${slot.type.toUpperCase()}
                        </span>
                    </td>
                </tr>`;
        });

        html += `</tbody></table>`;
        mainGrid.innerHTML = html;
        updateStatus("Regular Schedule Loaded");
    }

    function renderExamSchedule() {
        const pattern = document.getElementById('patternSelect').value;
        const activeGrades = SCHOOL_CONFIG.examPatterns[pattern][currentSession];
        const examData = SCHOOL_CONFIG.examSettings[currentSession];

        let html = `
            <div class="space-y-4">
                <div class="p-4 bg-orange-50 border-l-4 border-orange-400 mb-4">
                    <p class="text-sm text-orange-800 font-bold">Session: ${currentSession} | Reading Time: ${examData.coolOffStart} - ${examData.writingStart}</p>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">`;

        activeGrades.forEach(grade => {
            const finishTime = Utils.getExamEndTime(grade, currentSession);
            html += `
                <div class="p-4 border rounded-lg bg-white shadow-sm hover:border-blue-400 transition-all">
                    <h4 class="text-xl font-bold text-blue-800">Class ${grade}</h4>
                    <p class="text-gray-600 text-sm">Starts: ${examData.writingStart}</p>
                    <p class="text-blue-600 font-bold text-lg">Ends: ${finishTime}</p>
                    <div class="mt-2 text-xs text-gray-400">Duration: ${grade <= 8 ? '2.5 Hours' : '3 Hours'}</div>
                </div>`;
        });

        html += `</div></div>`;
        mainGrid.innerHTML = html;
        updateStatus(`Exam Schedule Generated for ${currentSession}`);
    }

    function updateStatus(msg) {
        document.getElementById('statusIndicator').innerText = msg;
    }
});
// Add this to app.js
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzTprXjKJsf64AVfEQpynXjvv1GcSf6l9pQympFih8MoS557wxKxZg3KmSWhyB9kPcRkg/exec";

async function syncFromCloud() {
    updateStatus("Syncing with Google Sheets...");
    try {
        const response = await fetch(SCRIPT_URL);
        const cloudData = await response.json();
        
        // Process the sheet data (skipping header)
        SCHOOL_CONFIG.teachers = cloudData.slice(1).map(row => ({
            id: row[0],
            name: row[1],
            dept: row[2]
        }));
        
        updateStatus("Cloud Sync Complete");
        generateGrid(); // Refresh the view with new data
    } catch (error) {
        updateStatus("Sync Failed: Use Offline Mode");
        console.error("Cloud Error:", error);
    }
}
window.exportPDF = function() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text("AGMHSS Patteeswaram - Timetable", 14, 15);
    doc.autoTable({ html: '#mainGrid table', startY: 20 });
    doc.save("AGMHSS_Timetable.pdf");
};

async function saveToCloud() {
    const currentData = {
        mode: document.getElementById('opMode').value,
        session: currentSession,
        data: SCHOOL_CONFIG.teachers // Or your generated schedule object
    };

    const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify(currentData)
    });
    
    if (response.ok) alert("Schedule archived to Google Sheets!");
}
