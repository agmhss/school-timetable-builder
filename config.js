const SCHOOL_CONFIG = {
  schoolName: "AGMHSS Patteeswaram",
  
  // 1. Grades and their standard durations (in minutes)
  gradeSettings: {
    junior: { grades: [6, 7, 8], writingTime: 150, coolOff: 15 },
    senior: { grades: [9, 10, 11, 12], writingTime: 180, coolOff: 15 }
  },

  // 2. Room Registry: Name and Bench Capacity
  // This helps the "Win-Win" logic avoid overcrowding
  rooms: [
    { id: "R1", name: "Hi-Tech Lab", capacity: 40 },
    { id: "R2", name: "Hall 10-A", capacity: 30 },
    { id: "R3", name: "Hall 10-B", capacity: 30 },
    { id: "R4", name: "Main Auditorium", capacity: 100 }
  ],

  // 3. Teacher Registry
  // We can add "Department" to help with subject-specific invigilation rules
  teachers: [
    { id: "T1", name: "Rajarajan", dept: "IT" },
    { id: "T2", name: "Sumathi", dept: "Tamil" },
    { id: "T3", name: "Leo", dept: "Python/CS" }
    // Add more staff here...
  ],

  // 4. Club & Special Activity Constraints
  // Based on TN State Guidelines (Kalai Thiruvizha, etc.)
  specialActivities: [
    { day: "Friday", period: "AN", name: "Club Activities / Kalai Thiruvizha" },
    { day: "Wednesday", period: "FN", name: "Career Guidance (9-12)" }
  ],

  // 5. Exam Patterns (The FN/AN logic we discussed)
  examPatterns: {
    "Standard": {
      "FN": [6, 8, 10, 12],
      "AN": [7, 9, 11]
    },
    "Alternate": {
      "FN": [7, 9, 11],
      "AN": [6, 8, 10, 12]
    }
  }
};
