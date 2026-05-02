/**
 * app.js - Advanced Auto-Generating Timetable & Exam Duty Scheduler for AGMHSS
 * Features: LKG to 12 Scale, Smart Spreading, Class Teacher (Period 1) Lock, Exam Invigilation
 */

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbywDbC_e5uRJcYHthWEmwuxvb3c8n-QCozoN2xMQhCpIS8XHQeTpO1qpknENNRP0o4TzQ/exec";

let generatedWeeklyTimetable = [];
const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
let currentSession = 'FN'; // Default Exam Session

function updateStatus(msg) {
    const indicator = document.getElementById('statusIndicator');
    if (indicator) indicator.innerText = msg;
}

document.addEventListener('DOMContentLoaded', () => {
    // 1. Regular Timetable Filters
    const viewType = document.getElementById('viewType');
    const viewFilter = document.getElementById('viewFilter');

    if(viewType && viewFilter) {
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
    }

    // 2. Exam Session Buttons Toggle (FN / AN)
    const sessionBtns = document.querySelectorAll('#btnFN, #btnAN');
    sessionBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            sessionBtns.forEach(b => b.classList.remove('bg-white', 'shadow-sm', 'text-blue-700', 'font-bold'));
            sessionBtns.forEach(b => b.classList.add('text-gray-500', 'hover:bg-gray-200'));
            
            e.target.classList.remove('text-gray-500', 'hover:bg-gray-200');
            e.target.classList.add('bg-white', 'shadow-sm', 'text-blue-700', 'font-bold');
            
            currentSession = e.target.id.replace('btn', '');
            updateStatus(`Switched to ${currentSession} Session`);
            
            // If currently in exam mode, refresh the grid immediately
            if (document.getElementById('opMode').value === 'exam') {
                window.generateGrid();
            }
        });
    });
});

// --- ROUTING ENGINE ---
// HTML-ல் உள்ள 'Process Schedule' பட்டன் இதைத்தான் அழைக்கும்
window.generateGrid = function() {
    const mode = document.getElementById('opMode').value;
    if (mode === 'regular') {
        renderRegularTimetable();
    } else {
        renderExamSchedule();
    }
};

// --- CORE ALGORITHM: Two-Phase Smart Distribution ---
function generateAutoTimetable() {
    generatedWeeklyTimetable = []; 
    let teacherAvail = {};
    let classAvail = {};
    let dailySubjectCount = {}; 

    if (!SCHOOL_CONFIG.assignments || SCHOOL_CONFIG.assignments.length === 0) return;

    const firstPeriod = SCHOOL_CONFIG.regularTimings.find(p => p.type === 'class');

    // PHASE 1: CLASS TEACHER PERIOD 1 ALLOCATION
    SCHOOL_CONFIG.assignments.forEach(req => {
        req.assignedCount = 0; 
        if (req.isClassTeacher && firstPeriod) {
            for (let day of daysOfWeek) {
                let timeKey = `${day}-${firstPeriod.label}`;

                if (!teacherAvail[req.teacherName]?.[timeKey] && !classAvail[req.className]?.[timeKey]) {
                    generatedWeeklyTimetable.push({
                        day: day,
                        period: firstPeriod.label,
                        time: `${firstPeriod.start} - ${firstPeriod.end}`,
                        className: req.className,
                        subjectName: req.subjectName,
                        teacherName: `⭐ ${req.teacherName}`
                    });

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

    // PHASE 2: DISTRIBUTE REMAINING PERIODS
    SCHOOL_CONFIG.assignments.forEach(req => {
        let remainingPeriods = req.periodsPerWeek - req.assignedCount;

        for (let i = 0; i < remainingPeriods; i++) {
            let dayIndex = (i + req.assignedCount) % 5; 
            let startDay = daysOfWeek[dayIndex];
            
            for (let period of SCHOOL_CONFIG.regularTimings) {
                if (period.type === 'break' || period.type === 'fixed') continue; 

                let timeKey = `${startDay}-${period.label}`;

                if (!teacherAvail[req.teacherName]?.[timeKey] && !classAvail[req.className]?.[timeKey]) {
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

                    if (!teacherAvail[req.teacherName]) teacherAvail[req.teacherName] = {};
                    teacherAvail[req.teacherName][timeKey] = true;

                    if (!classAvail[req.className]) classAvail[req.className] = {};
                    classAvail[req.className][timeKey] = true;

                    if (!dailySubjectCount[req.className]) dailySubjectCount[req.className] = {};
                    if (!dailySubjectCount[req.className][startDay]) dailySubjectCount[req.className][startDay] = {};
                    dailySubjectCount[req.className][startDay][req.subjectName] = countToday + 1;

                    req.assignedCount++;
                    break; 
                }
            }
        }
    });
    
    generatedWeeklyTimetable.sort((a, b) => {
        let dayDiff = daysOfWeek.indexOf(a.day) - daysOfWeek.indexOf(b.day);
        if (dayDiff !== 0) return dayDiff;
        return a.period.localeCompare(b.period, undefined, {numeric: true});
    });
}

// --- RENDER: REGULAR MATRIX VIEW ---
function renderRegularTimetable() {
    const mainGrid = document.getElementById('mainGrid');
    const viewType = document.getElementById('viewType').value;
    const filterVal = document.getElementById('viewFilter').value;

    if (generatedWeeklyTimetable.length === 0) {
        mainGrid.innerHTML = `<div class="text-red-500 font-bold p-4">No data generated. Click Sync Data first!</div>`;
        return;
    }

    if (viewType === 'all') {
        mainGrid.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full text-gray-500 py-20">
                <i data-lucide="grid" class="w-12 h-12 mb-2 opacity-30"></i>
                <p class="text-lg">Please select <b>By Class</b> or <b>By Teacher</b> to view the Grid.</p>
            </div>`;
        if (window.lucide) window.lucide.createIcons();
        return;
    }

    const teachingPeriods = SCHOOL_CONFIG.regularTimings.filter(p => p.type === 'class');

    let html = `<div class="overflow-x-auto">
        <table id="scheduleTable" class="w-full text-center border-collapse min-w-[800px] bg-white text-sm">
            <thead class="bg-blue-100 text-blue-900">
                <tr>
                    <th class="p-3 border border-blue-200 text-left w-24">Day</th>`;
    
    teachingPeriods.forEach((p, index) => {
        html += `<th class="p-3 border border-blue-200">
                    <div class="font-bold text-lg">${index + 1}</div>
                </th>`;
    });
    html += `</tr></thead><tbody>`;

    let displayData = generatedWeeklyTimetable;
    if (viewType === 'class') {
        displayData = generatedWeeklyTimetable.filter(d => d.className === filterVal);
    } else if (viewType === 'teacher') {
        displayData = generatedWeeklyTimetable.filter(d => d.teacherName.replace('⭐ ', '') === filterVal);
    }

    daysOfWeek.forEach(day => {
        html += `<tr>
            <td class="p-3 border border-gray-200 font-bold text-gray-700 bg-gray-50 text-left">${day}</td>`;
        
        teachingPeriods.forEach(period => {
            let slot = displayData.find(d => d.day === day && d.period === period.label);
            
            if (slot) {
                let cellText = "";
                if (viewType === 'class') {
                    cellText = `<span class="font-semibold text-gray-800">${slot.subjectName}</span><br>
                                <span class="text-xs text-blue-600 font-bold">${slot.teacherName.replace('⭐ ', '')}</span>`;
                } else if (viewType === 'teacher') {
                    cellText = `<span class="font-bold text-green-700">${slot.className}</span><br>
                                <span class="text-xs text-gray-600">${slot.subjectName}</span>`;
                }
                html += `<td class="p-2 border border-gray-200 hover:bg-blue-50 transition-colors align-middle leading-tight">${cellText}</td>`;
            } else {
                html += `<td class="p-2 border border-gray-200 text-gray-300 bg-gray-50/30">-</td>`;
            }
        });
        html += `</tr>`;
    });

    html += `</tbody></table></div>`;
    mainGrid.innerHTML = html;
    updateStatus(`Showing Grid for: ${filterVal}`);
}

// Global Tracker to remember duty counts across sessions
window.examDutyTracker = window.examDutyTracker || {};

// --- RENDER: EXAM SCHEDULE VIEW ---
function renderExamSchedule() {
    const pattern = document.getElementById('patternSelect').value;
    const activeGrades = SCHOOL_CONFIG.examPatterns[pattern][currentSession];
    const examData = SCHOOL_CONFIG.examSettings[currentSession];
    const mainGrid = document.getElementById('mainGrid');

    // 1. ஆசிரியர்களின் Profile-ஐ உருவாக்குதல் (அவர்கள் என்ன பாடம் எடுக்கிறார்கள் + எத்தனை டியூட்டி பார்த்துள்ளார்கள்)
    let teacherProfiles = {};
    if (SCHOOL_CONFIG.assignments && SCHOOL_CONFIG.assignments.length > 0) {
        SCHOOL_CONFIG.assignments.forEach(req => {
            let name = req.teacherName.replace('⭐ ', '');
            if (!teacherProfiles[name]) {
                teacherProfiles[name] = { 
                    subjects: new Set(), 
                    duties: window.examDutyTracker[name] || 0 // பழைய டியூட்டி கணக்கை எடுத்தல் 
                };
            }
            teacherProfiles[name].subjects.add(req.subjectName);
        });
    }

    let allTeachers = Object.keys(teacherProfiles);
    if (allTeachers.length === 0) {
        mainGrid.innerHTML = `<div class="text-red-500 font-bold p-4">No teachers found. Click Sync Data first!</div>`;
        return;
    }

    let html = `<div id="examContainer" class="space-y-6">
        <div class="p-4 bg-orange-50 border-l-4 border-orange-500 rounded-r-lg shadow-sm flex flex-col md:flex-row justify-between md:items-center gap-2">
            <div>
                <h3 class="font-bold text-orange-900 text-lg">Session: ${currentSession === 'FN' ? 'Morning (FN)' : 'Afternoon (AN)'}</h3>
                <p class="text-sm text-orange-800 font-medium">Reading Time: ${examData.coolOffStart} - ${examData.writingStart}</p>
            </div>
            <div class="text-sm bg-orange-200 text-orange-900 px-3 py-1 rounded font-bold">
                Writing Starts @ ${examData.writingStart}
            </div>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">`;

    activeGrades.forEach((grade, index) => {
        const isJunior = grade <= 8;
        const finishTime = isJunior ? examData.juniorEnd : examData.seniorEnd;
        const durationText = isJunior ? '2.5 Hours' : '3.0 Hours';

        // குறிப்பு: ஒரு உண்மையான சிஸ்டத்தில் "இன்று என்ன தேர்வு" என்ற டேட்டாவை Sheet-ல் இருந்து எடுக்க வேண்டும்.
        // தற்போதைக்கு அல்காரிதம் வேலை செய்ய ஒரு Placeholder வைத்துள்ளோம்.
        let currentExamSubject = "English"; // இதை எதிர்காலத்தில் Exam Timetable-உடன் இணைக்கலாம்

        // 2. Subject Exemption (பாடம் எடுப்பவரை வடிகட்டுதல்)
        let eligibleTeachers = allTeachers.filter(t => !teacherProfiles[t].subjects.has(currentExamSubject));
        
        // ஒருவேளை அனைவருமே அந்தப் பாடத்தை எடுப்பவர்களாக இருந்தால், வேறு வழியின்றி அனைவரையும் எடுத்துக்கொள்ளும் Fallback
        if (eligibleTeachers.length === 0) eligibleTeachers = allTeachers;

        // 3. Equal Distribution (குறைவான டியூட்டி பார்த்தவரை முன்னால் கொண்டு வருதல்)
        eligibleTeachers.sort((a, b) => teacherProfiles[a].duties - teacherProfiles[b].duties);

        // மிகக் குறைவான டியூட்டி பார்த்த ஆசிரியரைத் தேர்ந்தெடுத்தல்
        let dutyTeacher = eligibleTeachers[0];

        // 4. அவருக்கு ஒரு டியூட்டியைக் கணக்கில் ஏற்றுதல்
        teacherProfiles[dutyTeacher].duties += 1;
        window.examDutyTracker[dutyTeacher] = teacherProfiles[dutyTeacher].duties; // Global-ஆக சேமித்தல்

        html += `
            <div class="p-5 border border-gray-200 rounded-xl bg-white shadow-sm hover:border-blue-400 hover:shadow-md transition-all relative overflow-hidden">
                <div class="absolute top-0 left-0 w-full h-1 ${isJunior ? 'bg-green-400' : 'bg-blue-500'}"></div>
                
                <div class="flex justify-between items-start mb-4 mt-1">
                    <div>
                        <h4 class="text-2xl font-black text-gray-800">Class ${grade}</h4>
                        <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">${isJunior ? 'Junior Sec.' : 'Senior Sec.'}</span>
                    </div>
                    <span class="bg-gray-100 text-gray-700 text-xs px-2.5 py-1 rounded-md font-bold border border-gray-200">
                        Hall ${index + 1}
                    </span>
                </div>

                <div class="space-y-2 mb-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <div class="flex justify-between text-sm">
                        <span class="text-gray-500">Duration:</span>
                        <span class="font-bold text-gray-700">${durationText}</span>
                    </div>
                    <div class="flex justify-between text-sm">
                        <span class="text-gray-500">Ends at:</span>
                        <span class="font-bold ${isJunior ? 'text-green-600' : 'text-blue-600'}">${finishTime}</span>
                    </div>
                </div>

                <div class="pt-3 border-t border-gray-100 flex items-center justify-between">
                    <div class="flex flex-col">
                        <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Invigilator Duty</span>
                        <span class="text-base font-bold text-blue-700 flex items-center gap-1">
                            <i data-lucide="user-check" class="w-4 h-4"></i> ${dutyTeacher}
                        </span>
                    </div>
                </div>
            </div>`;
    });

    html += `</div></div>`;
    mainGrid.innerHTML = html;
    if (window.lucide) window.lucide.createIcons();
    updateStatus("Exam Schedule Loaded (Equal Duty Appled)");
}
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
                isClassTeacher: String(row[5]).trim().toLowerCase() === 'yes'
            }));
            
            updateStatus("Generating Schedule...");
            generateAutoTimetable(); 
            window.generateGrid(); // <--- Changed this to call the Router 
            
        } else {
            updateStatus("No data found.");
        }
        
    } catch (error) {
        updateStatus("Sync Failed!");
        console.error("Cloud Error:", error);
    }
};

// --- EXPORT FUNCTION ---
window.exportPDF = function() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    if (document.getElementById('opMode').value === 'exam') {
        doc.text("AGMHSS Exam Invigilation Schedule", 14, 15);
        doc.text(`Session: ${currentSession}`, 14, 25);
        doc.text("Please use screenshot for Exam Duty Cards.", 14, 35);
    } else {
        const filterType = document.getElementById('viewType').value;
        const filterVal = document.getElementById('viewFilter').value;
        let title = "AGMHSS Timetable";
        if (filterType === 'class') title += ` - Class ${filterVal}`;
        if (filterType === 'teacher') title += ` - ${filterVal}`;

        doc.text(title, 14, 15);
        doc.autoTable({ html: '#scheduleTable', startY: 20, theme: 'grid', styles: { fontSize: 8 } });
    }
    
    doc.save("AGMHSS_Schedule.pdf");
};
