/**
 * config.js
 * Source of Truth for AGMHSS Patteeswaram Timetable Engine
 * Updated: 2026-05-01
 */

const SCHOOL_CONFIG = {
    schoolName: "AGMHSS Patteeswaram",
    location: "Thanjavur, Tamil Nadu",
    
    // 1. Regular School Timings (8-Period Structure)
    // Reflects 45min blocks + 35min final blocks + 4:20 PM Close
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
        { label: "Period 7", start: "15:10", end: "15:45", type: "class" }, // 35 mins
        { label: "Period 8", start: "15:45", end: "16:20", type: "class" }  // 35 mins
    ],

    // 2. Exam Session Configurations
    // Staggered 2.5h vs 3h writing time + 15m Cool-off
    examSettings: {
        FN: {
            coolOffStart: "09:45",
            writingStart: "10:00",
            juniorEnd: "12:30", // Classes 6-8
            seniorEnd: "13:00"   // Classes 9-12
        },
        AN: {
            coolOffStart: "13:30",
            writingStart: "13:45",
            juniorEnd: "16:15", // Classes 6-8
            seniorEnd: "16:45"   // Classes 9-12
        }
    },

    // 3. Exam Participation Patterns
    // Used to toggle which grades write in which session
    examPatterns: {
        "Standard": {
            "FN": [6, 8, 10, 12],
            "AN": [7, 9, 11]
        },
        "Alternate": {
            "FN": [7, 9, 11],
            "AN": [6, 8, 10, 12]
        }
    },

    // 4. Room Registry
    // Used for capacity checking and automated hall allocation
    rooms: [
        { id: "R1", name: "Hi-Tech Lab", capacity: 40, type: "lab" },
        { id: "R2", name: "Hall 10-A", capacity: 32, type: "classroom" },
        { id: "R3", name: "Hall 10-B", capacity: 32, type: "classroom" },
        { id: "R4", name: "Auditorium", capacity: 120, type: "hall" }
    ],

    // 5. Staff Registry
    // Basic teacher list for duty assignment
    teachers: [
        { id: "T1", name: "Rajarajan", dept: "IT/Admin" },
        { id: "T2", name: "Sumathi", dept: "General" },
        { id: "T3", name: "Leo", dept: "Python/CS" }
    ],

    // 6. Tamil Nadu State Specific Constraints
    // Mandatory blocks for cultural/career initiatives
    stateMandates: {
        fridayAN: "Kalai Thiruvizha / Club Activities",
        careerGuidanceGrades: [9, 10, 11, 12],
        emisSyncRequired: true
    }
};
// Add this inside the SCHOOL_CONFIG object in config.js
assignments: [
    { period: "Period 1", class: "10-A", subject: "Mathematics", teacher: "Rajarajan" },
    { period: "Period 2", class: "10-A", subject: "Information Tech", teacher: "Leo" },
    // You will populate this from your Google Sheet eventually
],
