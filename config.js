/**
 * config.js
 * Source of Truth for AGMHSS Patteeswaram Timetable Engine
 * Updated: 2026-05-01
 */

const SCHOOL_CONFIG = {
    schoolName: "AGMHSS Patteeswaram",
    location: "Thanjavur, Tamil Nadu",
    
    // 1. Regular School Timings
    regularTimings: [
        { label: "Assembly", start: "09:10", end: "09:30", type: "fixed" },
        { label: "Period 1", start: "09:30", end: "10:15", type: "class" },
        { label: "Period 2", start: "10:15", end: "11:00", type: "class" },
        { label: "Short Break", start: "11:00", end: "11:10", type: "break" },
        { label: "Period 3", start: "11:10", end: "11:55", type: "class" },
        { label: "Period 4", start: "11:55", end: "12:40", type: "class" },
        { label: "Lunch Break", start: "12:40", end: "13:30", type: "break" },
        { label: "Period 5", start: "13:30", end: "14:15", type: "class" },
        { label: "Period 6", start: "14:15", end: "15:00", type: "class" },
        { label: "Short Break", start: "15:00", end: "15:10", type: "break" },
        { label: "Period 7", start: "15:10", end: "15:45", type: "class" },
        { label: "Period 8", start: "15:45", end: "16:20", type: "class" }
    ],

    // 2. Exam Session Configurations
    examSettings: {
        FN: { coolOffStart: "09:45", writingStart: "10:00", juniorEnd: "12:30", seniorEnd: "13:00" },
        AN: { coolOffStart: "13:30", writingStart: "13:45", juniorEnd: "16:15", seniorEnd: "16:45" }
    },

    // 3. Exam Participation Patterns
    examPatterns: {
        "Standard": { "FN": [6, 8, 10, 12], "AN": [7, 9, 11] },
        "Alternate": { "FN": [7, 9, 11], "AN": [6, 8, 10, 12] }
    },

    // 4. Room Registry
    rooms: [
        { id: "R1", name: "Hi-Tech Lab", capacity: 40, type: "lab" },
        { id: "R2", name: "Hall 10-A", capacity: 32, type: "classroom" },
        { id: "R3", name: "Hall 10-B", capacity: 32, type: "classroom" },
        { id: "R4", name: "Auditorium", capacity: 120, type: "hall" }
    ],

    // 5. Staff Registry
    teachers: [
        { id: "T1", name: "Rajarajan", dept: "IT/Admin" },
        { id: "T2", name: "Sumathi", dept: "General" },
        { id: "T3", name: "Leo", dept: "Python/CS" }
    ],

    // 6. Tamil Nadu State Specific Constraints
    stateMandates: {
        fridayAN: "Kalai Thiruvizha / Club Activities",
        careerGuidanceGrades: [9, 10, 11, 12],
        emisSyncRequired: true
    },

    // 7. NEW: Assignments Array (Properly placed inside the object)
    assignments: [
        { period: "Period 1", class: "10-A", subject: "Mathematics", teacher: "Rajarajan" },
        { period: "Period 2", class: "10-A", subject: "Information Tech", teacher: "Leo" }
    ]
}; // End of SCHOOL_CONFIG
