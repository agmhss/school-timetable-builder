/**
 * app.js - Advanced Timetable, Exam & Substitution Engine
 * Features: Horizontal Data Entry (One row per teacher), Smart Spreading, Cloud Sync
 */

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzFzkBoIld8L0hGq9pv9VoFNr-4iwq8HsyGKkbCoj58Cy3YvfHh5VpP7uWZPJScgEOr/exec";

// Global Trackers
let generatedWeeklyTimetable = [];
const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
let currentSession = 'FN'; 
window.examDutyTracker = window.examDutyTracker || {};
window.subDutyTracker = window.subDutyTracker || {};

function updateStatus(msg) {
    const indicator = document.getElementById('statusIndicator');
    if (indicator) indicator.innerText = msg;
}

// --- UI EVENT LISTENERS ---
document.addEventListener('DOMContentLoaded', () => {
    const viewType = document.getElementById('viewType');
    const viewFilter = document.getElementById('viewFilter');
    const opMode = document.getElementById('opMode');
    const examGroup = document.getElementById('examPatternGroup');
    const subGroup = document.getElementById('substituteGroup');

    if(opMode) {
        opMode.addEventListener('change', (e) => {
            if(examGroup) examGroup.classList.add('hidden');
            if(subGroup) subGroup.classList.add('hidden');
            
            if (e.target.value === 'exam' && examGroup) examGroup.classList.remove('hidden');
            if (e.target.value === 'substitution' && subGroup) subGroup.classList.remove('hidden');
        });
    }

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

    const sessionBtns = document.querySelectorAll('#btnFN, #btnAN');
    sessionBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            sessionBtns.forEach(b => b.classList.remove('bg-white', 'shadow-sm', 'text-blue-700', 'font-bold'));
            sessionBtns.forEach(b => b.classList.add('text-gray-500', 'hover:bg-gray-200'));
            e.target.classList.remove('text-gray-500', 'hover:bg-gray-200');
            e.target.classList.add('bg-white', 'shadow-sm', 'text-blue-700', 'font-bold');
            currentSession = e.target.id.replace('btn', '');
            
            if (document.getElementById('opMode').value === 'exam') window.generateGrid();
        });
    });
});

// --- ROUTING ENGINE ---
window.generateGrid = function() {
    const mode = document.getElementById('opMode').value;
    if (mode === 'regular') renderRegularTimetable();
    else if (mode === 'exam') renderExamSchedule();
    else if (mode === 'substitution') renderSubstituteSchedule();
};

// --- CORE TIMETABLE GENERATOR ---
function generateAutoTimetable() {
    generatedWeeklyTimetable = []; 
    let teacherAvail = {};
    let classAvail = {};
    let dailySubjectCount = {}; 

    if (!SCHOOL_CONFIG.assignments || SCHOOL_CONFIG.assignments.length === 0) return;
    const firstPeriod = SCHOOL_CONFIG.regularTimings.find(p => p.type === 'class');

    // Phase 1: Lock Class Teachers
    SCHOOL_CONFIG.assignments.forEach(req => {
        req.assignedCount = 0; 
        if (req.isClassTeacher && firstPeriod) {
            for (let day of daysOfWeek) {
                let timeKey = `${day}-${firstPeriod.label}`;
                if (!teacherAvail[req.teacherName]?.[timeKey] && !classAvail[req.className]?.[timeKey]) {
                    generatedWeeklyTimetable.push({
                        day: day, period: firstPeriod.label, time: `${firstPeriod.start} - ${firstPeriod.end}`,
                        className: req.className, subjectName: req.subjectName, teacherName: `⭐ ${req.teacherName}`
                    });
                    if (!teacherAvail[req.teacherName]) teacherAvail[req.teacherName] = {};
                    teacherAvail[req.teacherName][timeKey] = true;
                    if (!classAvail[req.className]) classAvail[req.className] = {};
                    classAvail[req.className][timeKey] = true;
                    req.assignedCount++;
                }
            }
        }
    });

    // Phase 2: Distribute remaining periods
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
                        day: startDay, period: period.label, time: `${period.start} - ${period.end}`,
                        className: req.className, subjectName: req.subjectName, teacherName: req.teacherName
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
}

// --- RENDER 1: REGULAR TIMETABLE ---
function renderRegularTimetable() {
    const mainGrid = document.getElementById('mainGrid');
    const viewType = document.getElementById('viewType')?.value || 'all';
    const filterVal = document.getElementById('viewFilter')?.value || '';

    if (generatedWeeklyTimetable.length === 0) {
        mainGrid.innerHTML = `<div class="text-red-500 font-bold p-4">No data generated. Click Sync Data first!</div>`;
        return;
    }

    if (viewType === 'all') {
        mainGrid.innerHTML = `<div class="flex flex-col items-center justify-center h-full text-gray-500 py-20">
            <i data-lucide="grid" class="w-12 h-12 mb-2 opacity-30"></i>
            <p class="text-lg">Please select <b>By Class</b> or <b>By Teacher</b> to view the Grid.</p>
        </div>`;
        if (window.lucide) window.lucide.createIcons();
        return;
    }

    const teachingPeriods = SCHOOL_CONFIG.regularTimings.filter(p => p.type === 'class');
    let html = `<div class="overflow-x-auto"><table id="scheduleTable" class="w-full text-center border-collapse min-w-[800px] bg-white text-sm"><thead class="bg-blue-100 text-blue-900"><tr><th class="p-3 border border-blue-200 text-left w-24">Day</th>`;
    
    teachingPeriods.forEach((p, index) => { html += `<th class="p-3 border border-blue-200"><div class="font-bold text-lg">${index + 1}</div></th>`; });
    html += `</tr></thead><tbody>`;

    let displayData = generatedWeeklyTimetable;
    if (viewType === 'class') displayData = generatedWeeklyTimetable.filter(d => d.className === filterVal);
    else if (viewType === 'teacher') displayData = generatedWeeklyTimetable.filter(d => d.teacherName.replace('⭐ ', '') === filterVal);

    daysOfWeek.forEach(day => {
        html += `<tr><td class="p-3 border border-gray-200 font-bold text-gray-700 bg-gray-50 text-left">${day}</td>`;
        teachingPeriods.forEach(period => {
            let slot = displayData.find(d => d.day === day && d.period === period.label);
            if (slot) {
                let cellText = viewType === 'class' 
                    ? `<span class="font-semibold text-gray-800">${slot.subjectName}</span><br><span class="text-xs text-blue-600 font-bold">${slot.teacherName.replace('⭐ ', '')}</span>`
                    : `<span class="font-bold text-green-700">${slot.className}</span><br><span class="text-xs text-gray-600">${slot.subjectName}</span>`;
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

// --- RENDER 2: EXAM SCHEDULE ---
function renderExamSchedule() {
    const pattern = document.getElementById('patternSelect').value;
    const activeGrades = SCHOOL_CONFIG.examPatterns[pattern][currentSession];
    const examData = SCHOOL_CONFIG.examSettings[currentSession];
    const mainGrid = document.getElementById('mainGrid');

    let teacherProfiles = {};
    if (SCHOOL_CONFIG.assignments && SCHOOL_CONFIG.assignments.length > 0) {
        SCHOOL_CONFIG.assignments.forEach(req => {
            let name = req.teacherName.replace('⭐ ', '');
            if (!teacherProfiles[name]) {
                teacherProfiles[name] = { subjects: new Set(), duties: window.examDutyTracker[name] || 0 };
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
            <div class="text-sm bg-orange-200 text-orange-900 px-3 py-1 rounded font-bold">Writing Starts @ ${examData.writingStart}</div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">`;

    activeGrades.forEach((grade, index) => {
        const isJunior = grade <= 8;
        const finishTime = isJunior ? examData.juniorEnd : examData.seniorEnd;
        const durationText = isJunior ? '2.5 Hours' : '3.0 Hours';

        let currentExamSubject = "English"; 
        let eligibleTeachers = allTeachers.filter(t => !teacherProfiles[t].subjects.has(currentExamSubject));
        if (eligibleTeachers.length === 0) eligibleTeachers = allTeachers; 
        
        eligibleTeachers.sort((a, b) => teacherProfiles[a].duties - teacherProfiles[b].duties);
        let dutyTeacher = eligibleTeachers[0];
        
        teacherProfiles[dutyTeacher].duties += 1;
        window.examDutyTracker[dutyTeacher] = teacherProfiles[dutyTeacher].duties;

        html += `
            <div class="p-5 border border-gray-200 rounded-xl bg-white shadow-sm hover:border-blue-400 hover:shadow-md transition-all relative overflow-hidden">
                <div class="absolute top-0 left-0 w-full h-1 ${isJunior ? 'bg-green-400' : 'bg-blue-500'}"></div>
                <div class="flex justify-between items-start mb-4 mt-1">
                    <div><h4 class="text-2xl font-black text-gray-800">Class ${grade}</h4><span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">${isJunior ? 'Junior' : 'Senior'}</span></div>
                    <span class="bg-gray-100 text-gray-700 text-xs px-2.5 py-1 rounded-md font-bold border border-gray-200">Hall ${index + 1}</span>
                </div>
                <div class="space-y-2 mb-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <div class="flex justify-between text-sm"><span class="text-gray-500">Duration:</span><span class="font-bold text-gray-700">${durationText}</span></div>
                    <div class="flex justify-between text-sm"><span class="text-gray-500">Ends at:</span><span class="font-bold ${isJunior ? 'text-green-600' : 'text-blue-600'}">${finishTime}</span></div>
                </div>
                <div class="pt-3 border-t border-gray-100 flex items-center justify-between">
                    <div class="flex flex-col"><span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Invigilator Duty</span><span class="text-base font-bold text-blue-700 flex items-center gap-1"><i data-lucide="user-check" class="w-4 h-4"></i> ${dutyTeacher}</span></div>
                </div>
            </div>`;
    });

    html += `</div></div>`;
    mainGrid.innerHTML = html;
    if (window.lucide) window.lucide.createIcons();
    updateStatus("Exam Schedule Loaded");
}

// --- RENDER 3: SUBSTITUTION MANAGER ---
function renderSubstituteSchedule() {
    const mainGrid = document.getElementById('mainGrid');
    const day = document.getElementById('subDay').value;
    
    const absentCheckboxes = document.querySelectorAll('.absent-chk:checked');
    const absentTeachers = Array.from(absentCheckboxes).map(cb => cb.value);

    if (absentTeachers.length === 0) {
        mainGrid.innerHTML = `<div class="p-6 bg-red-50 text-red-600 font-bold border border-red-200 rounded-lg flex items-center gap-2"><i data-lucide="alert-circle"></i> Please select at least one absent teacher.</div>`;
        if (window.lucide) window.lucide.createIcons();
        return;
    }

    let vacantSlots = generatedWeeklyTimetable.filter(slot =>
        slot.day === day && absentTeachers.includes(slot.teacherName.replace('⭐ ', ''))
    );

    if (vacantSlots.length === 0) {
         mainGrid.innerHTML = `<div class="p-6 bg-green-50 text-green-700 font-bold border border-green-200 rounded-lg flex items-center gap-2"><i data-lucide="check-circle"></i> No classes scheduled for the selected absent teachers on ${day}.</div>`;
         if (window.lucide) window.lucide.createIcons();
         return;
    }

    vacantSlots.sort((a,b) => a.period.localeCompare(b.period, undefined, {numeric: true}));
    let allTeachers = [...new Set(SCHOOL_CONFIG.assignments.map(a => a.teacherName.replace('⭐ ', '')))];
    let presentTeachers = allTeachers.filter(t => !absentTeachers.includes(t));

    let html = `<div class="mb-4 flex justify-between items-end">
                    <h3 class="font-bold text-xl text-red-700">Substitution Required for ${day}</h3>
                    <div class="flex gap-2">
                        <button onclick="window.print()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 text-sm rounded shadow font-bold transition-colors">Print Sub Sheet</button>
                        <button onclick="saveDutiesToCloud()" class="bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 text-sm rounded shadow font-bold transition-colors">Save Counts to Sheet</button>
                    </div>
                </div>
                <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse bg-white shadow-sm border border-gray-200">
            <thead class="bg-red-50 text-red-900 border-b border-red-200">
                <tr><th class="p-3 border-r">Period</th><th class="p-3 border-r">Class</th><th class="p-3 border-r">Absent Teacher</th><th class="p-3">Assign Substitute</th></tr>
            </thead>
            <tbody>`;

    let tempDutyTracker = { ...window.subDutyTracker };

    vacantSlots.forEach(slot => {
        let busyThisPeriod = generatedWeeklyTimetable
            .filter(s => s.day === day && s.period === slot.period)
            .map(s => s.teacherName.replace('⭐ ', ''));

        let freeTeachers = presentTeachers.filter(t => !busyThisPeriod.includes(t));
        freeTeachers.sort((a, b) => (tempDutyTracker[a] || 0) - (tempDutyTracker[b] || 0));

        let suggestedTeacher = freeTeachers.length > 0 ? freeTeachers[0] : null;
        if (suggestedTeacher) {
            tempDutyTracker[suggestedTeacher] = (tempDutyTracker[suggestedTeacher] || 0) + 1;
            window.subDutyTracker[suggestedTeacher] = tempDutyTracker[suggestedTeacher]; 
        }

        let optionsHtml = freeTeachers.map(t => {
            let dutyCount = window.subDutyTracker[t] || 0;
            let isSelected = (t === suggestedTeacher) ? 'selected' : '';
            return `<option value="${t}" ${isSelected}>${t} (Duties: ${dutyCount})</option>`;
        }).join('');

        let noFreeTeacherMsg = freeTeachers.length === 0 ? `<option value="">⚠️ No Free Teachers Available!</option>` : '';

        html += `<tr class="border-b hover:bg-gray-50">
            <td class="p-3 border-r font-bold text-gray-700">${slot.period}</td>
            <td class="p-3 border-r font-black text-blue-800">${slot.className}</td>
            <td class="p-3 border-r text-red-600 font-medium line-through">${slot.teacherName.replace('⭐ ', '')} <span class="text-xs text-gray-400">(${slot.subjectName})</span></td>
            <td class="p-3">
                <select class="w-full p-2 border ${freeTeachers.length === 0 ? 'border-red-300 bg-red-50 text-red-700' : 'border-gray-300'} rounded font-semibold text-green-700 outline-none focus:ring-2 focus:ring-green-400">
                    ${noFreeTeacherMsg} ${optionsHtml}
                </select>
            </td>
        </tr>`;
    });

    html += `</tbody></table></div>`;
    mainGrid.innerHTML = html;
    if (window.lucide) window.lucide.createIcons();
    updateStatus("Substitution Manager Loaded");
}

// --- CLOUD SYNC & NEW HORIZONTAL PARSING ALGORITHM ---
function populateAbsentTeachersList() {
    let allTeachers = [...new Set(SCHOOL_CONFIG.assignments.map(a => a.teacherName.replace('⭐ ', '')))].sort();
    const listDiv = document.getElementById('absentTeachersList');
    if(!listDiv) return;
    
    listDiv.innerHTML = allTeachers.map(t => 
        `<label class="flex items-center gap-1 bg-white border px-2 py-1 rounded cursor-pointer hover:bg-red-50">
            <input type="checkbox" class="absent-chk" value="${t}"> ${t}
        </label>`
    ).join('');
}

window.syncFromCloud = async function() {
    updateStatus("Downloading Sheets...");
    try {
        const response = await fetch(SCRIPT_URL);
        const cloudData = await response.json();

        // 1. Load Duty Tracker
        window.subDutyTracker = {};
        if (cloudData.tracker && cloudData.tracker.length > 1) {
            cloudData.tracker.slice(1).forEach(row => {
                let tName = String(row[0]).trim();
                window.subDutyTracker[tName] = parseInt(row[1]) || 0;
            });
        }

        // 2. Parse Horizontal Assignments (The New Logic!)
        SCHOOL_CONFIG.assignments = [];
        if (cloudData.assignments && cloudData.assignments.length > 1) {
            cloudData.assignments.slice(1).forEach(row => {
                let teacherName = String(row[0] || '').trim();
                let subjectName = String(row[1] || '').trim();

                if (!teacherName) return; 

                // Loop through columns in steps of 4 starting from Col C (index 2)
                for (let i = 2; i < row.length; i += 4) {
                    let cls = String(row[i] || '').trim();
                    let sec = String(row[i+1] || '').trim();
                    let periods = parseInt(row[i+2]);
                    let isCT = String(row[i+3] || '').trim().toLowerCase() === 'yes';

                    // If class exists and periods are assigned, push it to our standard format
                    if (cls && !isNaN(periods) && periods > 0) {
                        SCHOOL_CONFIG.assignments.push({
                            teacherName: teacherName,
                            subjectName: subjectName,
                            className: cls + "-" + sec,
                            periodsPerWeek: periods,
                            isClassTeacher: isCT
                        });
                    }
                }
            });
            
            updateStatus("Generating Schedule...");
            generateAutoTimetable(); 
            populateAbsentTeachersList(); 
            window.generateGrid(); 
            
        } else {
            updateStatus("No assignment data found.");
        }
    } catch (error) {
        updateStatus("Sync Failed!");
        console.error("Cloud Error:", error);
    }
};

// --- SAVE DUTY COUNTS TO CLOUD ---
window.saveDutiesToCloud = async function() {
    updateStatus("Saving Duty Counts to Google Sheet...");
    const selects = document.querySelectorAll('select.w-full'); 
    let finalDutyTracker = { ...window.subDutyTracker }; 
    
    selects.forEach(select => {
        let assignedTeacher = select.value;
        if (assignedTeacher) {
            finalDutyTracker[assignedTeacher] = (finalDutyTracker[assignedTeacher] || 0) + 1;
        }
    });

    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: "updateSubTracker", data: finalDutyTracker })
        });
        await response.text();
        updateStatus("Saved Successfully!");
        window.subDutyTracker = finalDutyTracker; 
        alert("Substitution Duty counts have been permanently saved to the Master Sheet!");
    } catch (error) {
        updateStatus("Save Failed!");
        console.error("Error saving to cloud:", error);
        alert("Failed to save data. Please check your internet connection.");
    }
};

// --- EXPORT PDF ---
window.exportPDF = function() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const mode = document.getElementById('opMode').value;
    
    if (mode === 'exam') {
        doc.text("AGMHSS Exam Invigilation Schedule", 14, 15);
        doc.text(`Session: ${currentSession}`, 14, 25);
        doc.text("Please use screenshot for Exam Duty Cards.", 14, 35);
    } else if (mode === 'substitution') {
        doc.text("AGMHSS Substitution Duty", 14, 15);
        doc.text("Please use the 'Print Sub Sheet' button on the screen.", 14, 25);
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
