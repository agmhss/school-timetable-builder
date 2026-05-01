/**
 * utils.js
 * Core logic for calculating Exam Durations
 */

const EXAM_TIMINGS = {
    FN: { start: "09:45", coolOffEnd: "10:00" },
    AN: { start: "13:30", coolOffEnd: "13:45" }
};

function calculateExamEnd(grade, session) {
    const config = EXAM_TIMINGS[session];
    const startTime = new Date(`2026-05-01 ${config.coolOffEnd}`);
    
    // Logic: 6-8 get 150 mins (2.5h), 9-12 get 180 mins (3h)
    const duration = (grade >= 6 && grade <= 8) ? 150 : 180;
    
    const endTime = new Date(startTime.getTime() + duration * 60000);
    
    return endTime.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: true 
    });
}

// Example Usage for Dashboard:
// console.log(calculateExamEnd(8, 'FN')); // Result: 12:30 PM
// console.log(calculateExamEnd(10, 'FN')); // Result: 01:00 PM
