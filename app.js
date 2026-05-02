/**
 * app.js - Advanced Auto-Generating Timetable for AGMHSS
 * Features: LKG to 12 Scale, Smart Spreading, Class Teacher (Period 1) Lock
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
            generatedWeeklyTimetable.forEach(slot => options.add(slot.teacherName.replace('⭐ ', '')));
        } else {
            viewFilter.classList.add('hidden');
        }

        Array.from(options).sort((a,b) => a.localeCompare(b, undefined, {numeric: true})).forEach(opt => {
            viewFilter.innerHTML += `<option value="${opt}">${opt}</option>`;
        });
    });
});

// --- CORE ALGORITHM: Two-Phase Smart Distribution ---
function generateAutoTimetable() {
    generatedWeeklyTimetable = []; 
    let teacherAvail = {};
    let classAvail = {};
    let dailySubjectCount = {}; 

    if (!SCHOOL_CONFIG.assignments || SCHOOL_CONFIG.assignments.length === 0) return;

    // முதல் கிளாஸ் பீரியட் எது என்பதைக் கண்டறிதல் (பொதுவாக Period 1)
    const firstPeriod = SCHOOL_CONFIG.regularTimings.find(p => p.type === 'class');

    // ==========================================
    // PHASE 1: CLASS TEACHER PERIOD 1 ALLOCATION
    // ==========================================
    SCHOOL_CONFIG.assignments.forEach(req => {
        req.assignedCount = 0; // கவுண்டரைத் தொடங்குதல்

        if (req.isClassTeacher && firstPeriod) {
            for (let day of daysOfWeek) {
                let timeKey = `${day}-${firstPeriod.label}`;

                // ஆசிரியர் மற்றும் வகுப்பு இரண்டும் காலியாக உள்ளதா எனப் சரிபார்த்தல்
                if (!teacherAvail[req.teacherName]?.[timeKey] && !classAvail[req.className]?.[timeKey]) {
                    
                    generatedWeeklyTimetable.push({
                        day: day,
                        period: firstPeriod.label,
                        time: `${firstPeriod.start} - ${firstPeriod.end}`,
                        className: req.className,
                        subjectName: req.subjectName,
                        teacherName: `⭐ ${req.teacherName}` // வகுப்பு ஆசிரியர் என்பதை குறிக்க நட்சத்திரம்
                    });

                    // Lock the slots
                    if (!teacherAvail[req.teacherName]) teacherAvail[req.teacherName] = {};
                    teacherAvail[req.teacherName][timeKey] = true;

                    if (!classAvail[req.className]) classAvail[req.className] = {};
                    classAvail[req.className][timeKey] = true;

                    if (!dailySubjectCount[req.className]) dailySubjectCount[req.className] = {};
                    if (!dailySubjectCount[req.className][day]) dailySubjectCount[req.className][day] = {};
                    dailySubjectCount[req.className][day][req.subjectName] = 1;

                    req.assignedCount++;
                }
            }
        }
    });

    // ==========================================
    // PHASE 2: DISTRIBUTE REMAINING PERIODS
    // ==========================================
    SCHOOL_CONFIG.assignments.forEach(req => {
        let remainingPeriods = req.periodsPerWeek - req.assignedCount;

        for (let i = 0; i < remainingPeriods; i++) {
            // பரவலாகப் பகிர்ந்தளிக்க Day Offset-ஐப் பயன்படுத்துதல்
            let dayIndex = (i + req.assignedCount) % 5; 
            let startDay = daysOfWeek[dayIndex];
            
            for (let period of SCHOOL_CONFIG.regularTimings) {
                if (period.type === 'break' || period.type === 'fixed') continue; 

                let timeKey = `${startDay}-${period.label}`;

                if (!teacherAvail[req.teacherName]?.[timeKey] && !classAvail[req.className]?.[timeKey]) {
                    
                    // ஒரே பாடம் ஒரு நாளில் 2 முறைக்கு மேல் வரக்கூடாது
                    let countToday = dailySubjectCount[req.className]?.[startDay]?.[req.subjectName] || 0;
                    if (countToday >= 2) continue; 

                    generatedWeeklyTimetable.push({
                        day: startDay,
                        period: period.label,
                        time: `${period.start} - ${period.end}`,
                        className: req.className,
                        subjectName: req.subjectName,
                        teacherName: req.teacherName
                    });

                    // Lock the slots
                    if (!teacherAvail[req.teacherName]) teacherAvail[req.teacherName] = {};
                    teacherAvail[req.teacherName][timeKey] = true;

                    if (!classAvail[req.className]) classAvail[req.className] = {};
                    classAvail[req.className][timeKey] = true;

                    if (!dailySubjectCount[req.className]) dailySubjectCount[req.className] = {};
                    if (!dailySubjectCount[req.className][startDay]) dailySubjectCount[req.className][startDay] = {};
                    dailySubjectCount[req.className][startDay][req.subjectName] = countToday + 1;

                    req.assignedCount++;
                    break; // Move to the next required period
                }
            }
        }
    });
    
    // Sort logically
    generatedWeeklyTimetable.sort((a, b) => {
        let dayDiff = daysOfWeek.indexOf(a.day) - daysOfWeek.indexOf(b.day);
        if (dayDiff !== 0) return dayDiff;
        return a.period.localeCompare(b.period, undefined, {numeric: true});
    });

    console.log("Two-Phase Auto-Generation Complete!");
}

// --- RENDER ENGINE ---
// --- RENDER ENGINE (Matrix Grid View) ---
window.renderTimetable = function() {
    const mainGrid = document.getElementById('mainGrid');
    const viewType = document.getElementById('viewType').value;
    const filterVal = document.getElementById('viewFilter').value;

    if (generatedWeeklyTimetable.length === 0) {
        mainGrid.innerHTML = `<div class="text-red-500 font-bold p-4">No data generated. Click Sync Data first!</div>`;
        return;
    }

    // Grid View-ல் "All" என்பதை ஒரே டேபிளில் காட்ட முடியாது. எனவே Class அல்லது Teacher-ஐ தேர்ந்தெடுக்கச் சொல்லலாம்.
    if (viewType === 'all') {
        mainGrid.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full text-gray-500 py-20">
                <i data-lucide="grid" class="w-12 h-12 mb-2 opacity-30"></i>
                <p class="text-lg">Please select <b>By Class</b> or <b>By Teacher</b> to view the Grid.</p>
            </div>`;
        if (window.lucide) window.lucide.createIcons();
        return;
    }

    // Breaks-ஐத் தவிர்த்து, பாடம் நடக்கும் 8 Periods-ஐ மட்டும் நெடுவரிசைகளாக (Columns) எடுக்கிறோம்
    const teachingPeriods = SCHOOL_CONFIG.regularTimings.filter(p => p.type === 'class');

    let html = `<div class="overflow-x-auto">
        <table id="scheduleTable" class="w-full text-center border-collapse min-w-[800px] bg-white text-sm">
            <thead class="bg-blue-100 text-blue-900">
                <tr>
                    <th class="p-3 border border-blue-200 text-left w-24">Day</th>`;
    
    // Header Row: 1, 2, 3, 4 ... 8 என்று நம்பர்களை உருவாக்குதல்
    teachingPeriods.forEach((p, index) => {
        html += `<th class="p-3 border border-blue-200">
                    <div class="font-bold text-lg">${index + 1}</div>
                </th>`;
    });
    html += `</tr></thead><tbody>`;

    // Dropdown-ல் தேர்ந்தெடுத்ததை வைத்து டேட்டாவை வடிகட்டுதல்
    let displayData = generatedWeeklyTimetable;
    if (viewType === 'class') {
        displayData = generatedWeeklyTimetable.filter(d => d.className === filterVal);
    } else if (viewType === 'teacher') {
        displayData = generatedWeeklyTimetable.filter(d => d.teacherName.replace('⭐ ', '') === filterVal);
    }

    // திங்கள் முதல் வெள்ளி வரை ஒவ்வொரு நாளாக உருவாக்குதல் (Rows)
    daysOfWeek.forEach(day => {
        html += `<tr>
            <td class="p-3 border border-gray-200 font-bold text-gray-700 bg-gray-50 text-left">${day}</td>`;
        
        // அந்த நாளின் 8 பீரியட்களையும் நிரப்புதல்
        teachingPeriods.forEach(period => {
            // இந்த நாள் மற்றும் இந்த பீரியடில் வகுப்பு ஒதுக்கப்பட்டுள்ளதா எனத் தேடுதல்
            let slot = displayData.find(d => d.day === day && d.period === period.label);
            
            if (slot) {
                let cellText = "";
                if (viewType === 'class') {
                    // Class View: Subject & Teacher (உ.ம்: English-GTN)
                    cellText = `<span class="font-semibold text-gray-800">${slot.subjectName}</span><br>
                                <span class="text-xs text-blue-600 font-bold">${slot.teacherName.replace('⭐ ', '')}</span>`;
                } else if (viewType === 'teacher') {
                    // Teacher View: Class & Subject (உ.ம்: 10-A-English)
                    cellText = `<span class="font-bold text-green-700">${slot.className}</span><br>
                                <span class="text-xs text-gray-600">${slot.subjectName}</span>`;
                }
                html += `<td class="p-2 border border-gray-200 hover:bg-blue-50 transition-colors align-middle leading-tight">${cellText}</td>`;
            } else {
                // காலியான பீரியட்
                html += `<td class="p-2 border border-gray-200 text-gray-300 bg-gray-50/30">-</td>`;
            }
        });
        html += `</tr>`;
    });

    html += `</tbody></table></div>`;
    mainGrid.innerHTML = html;
    updateStatus(`Showing Grid for: ${filterVal}`);
};

// --- CLOUD SYNC ---
window.syncFromCloud = async function() {
    updateStatus("Downloading Sheets...");
    try {
        const response = await fetch(SCRIPT_URL);
        const cloudData = await response.json();

        if (cloudData.assignments && cloudData.assignments.length > 1) {
            SCHOOL_CONFIG.assignments = cloudData.assignments.slice(1).map(row => ({
                teacherName: String(row[0]).trim(),                     
                subjectName: String(row[1]).trim(),                     
                className: String(row[2]).trim() + "-" + String(row[3]).trim(), 
                periodsPerWeek: parseInt(row[4]) || 5,                  
                isClassTeacher: String(row[5]).trim().toLowerCase() === 'yes' // Col F: Class Teacher Check
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
