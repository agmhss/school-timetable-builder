/**
 * utils.js
 * Logic Engine for AGMHSS Timetable
 */

const Utils = {
    /**
     * Formats a Date object into a readable 12-hour string (e.g., "12:30 PM")
     */
    formatTime: function(date) {
        return date.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit', 
            hour12: true 
        });
    },

    /**
     * Calculates the exam end time based on grade and session
     * Logic: 6-8 (150 mins), 9-12 (180 mins)
     */
    getExamEndTime: function(grade, session) {
        const settings = SCHOOL_CONFIG.examSettings[session];
        // Create a base date using the writing start time from config.js
        const startTime = new Date(`2026-05-01 ${settings.writingStart}`);
        
        const duration = (grade >= 6 && grade <= 8) ? 150 : 180;
        const endTime = new Date(startTime.getTime() + duration * 60000);
        
        return this.formatTime(endTime);
    },

    /**
     * Filters the teacher list based on a specific department
     */
    getTeachersByDept: function(dept) {
        return SCHOOL_CONFIG.teachers.filter(t => t.dept === dept);
    },

    /**
     * Checks if a specific room is over capacity
     * @param {string} roomId - ID from config.js
     * @param {number} studentCount - Current number of students assigned
     */
    isOverCapacity: function(roomId, studentCount) {
        const room = SCHOOL_CONFIG.rooms.find(r => r.id === roomId);
        return studentCount > room.capacity;
    }
};
