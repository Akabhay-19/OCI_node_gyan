import express from 'express';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * Attendance Routes - Migrating from localStorage to Database
 * 
 * Endpoints:
 * GET    /attendance/:classId/:date     - Get attendance for a class on a date
 * GET    /attendance/history/:classId    - Get attendance history for a class
 * GET    /attendance/student/:studentId - Get attendance history for a student
 * POST   /attendance                    - Save attendance for a class/date
 * PUT    /attendance/:id                - Update a single attendance record (admin only)
 */

export const createAttendanceRoutes = (supabase) => {
    router.use(verifyToken);

    // GET attendance for a specific class on a specific date
    router.get('/:classId/:date', async (req, res) => {
        try {
            const { classId, date } = req.params;

            // Validate date format (YYYY-MM-DD or locale string)
            const parsedDate = new Date(date).toISOString().split('T')[0];

            const { data, error } = await supabase
                .from('attendance_records')
                .select('*')
                .eq('classId', classId)
                .eq('date', parsedDate);

            if (error) throw error;

            // Transform to Record<studentId, status> for frontend compatibility
            const attendanceMap = {};
            data.forEach(record => {
                attendanceMap[record.studentId] = record.status;
            });

            res.json({
                classId,
                date: parsedDate,
                records: attendanceMap,
                count: data.length
            });
        } catch (err) {
            console.error('Error fetching attendance:', err);
            res.status(500).json({ error: err.message });
        }
    });

    // GET attendance history for a class (last 30 days default)
    router.get('/history/:classId', async (req, res) => {
        try {
            const { classId } = req.params;
            const days = parseInt(req.query.days) || 30;

            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            const { data, error } = await supabase
                .from('attendance_records')
                .select('*')
                .eq('classId', classId)
                .gte('date', startDate.toISOString().split('T')[0])
                .order('date', { ascending: false });

            if (error) throw error;

            res.json(data);
        } catch (err) {
            console.error('Error fetching class attendance history:', err);
            res.status(500).json({ error: err.message });
        }
    });

    // GET attendance history for a specific student
    router.get('/student/:studentId', async (req, res) => {
        try {
            const { studentId } = req.params;
            const days = parseInt(req.query.days) || 365;
            const classId = req.query.classId; // Optional filter

            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            let query = supabase
                .from('attendance_records')
                .select('*')
                .eq('studentId', studentId)
                .gte('date', startDate.toISOString().split('T')[0])
                .order('date', { ascending: false });

            if (classId) {
                query = query.eq('classId', classId);
            }

            const { data, error } = await query;

            if (error) throw error;

            // Calculate stats
            const stats = {
                total: data.length,
                present: data.filter(r => r.status === 'PRESENT').length,
                absent: data.filter(r => r.status === 'ABSENT').length,
                late: data.filter(r => r.status === 'LATE').length,
                excused: data.filter(r => r.status === 'EXCUSED' || r.status === 'HOLIDAY').length
            };
            stats.percentage = stats.total > 0
                ? Math.round((stats.present / stats.total) * 100)
                : 100;

            res.json({
                studentId,
                records: data,
                stats
            });
        } catch (err) {
            console.error('Error fetching student attendance:', err);
            res.status(500).json({ error: err.message });
        }
    });

    // POST - Save attendance for a class on a date
    router.post('/', async (req, res) => {
        try {
            const { classId, schoolId, date, records, markedById } = req.body;

            // Validate required fields
            if (!classId || !records || Object.keys(records).length === 0) {
                return res.status(400).json({ error: 'classId and records are required' });
            }

            // Parse date
            const parsedDate = date
                ? new Date(date).toISOString().split('T')[0]
                : new Date().toISOString().split('T')[0];

            // Check if attendance already exists for this class/date
            const { data: existing } = await supabase
                .from('attendance_records')
                .select('id')
                .eq('classId', classId)
                .eq('date', parsedDate)
                .limit(1);

            if (existing && existing.length > 0) {
                // Update existing records
                const updates = Object.entries(records).map(async ([studentId, status]) => {
                    const { error } = await supabase
                        .from('attendance_records')
                        .upsert({
                            classId,
                            schoolId,
                            studentId,
                            date: parsedDate,
                            status,
                            markedById,
                            createdAt: new Date().toISOString()
                        }, {
                            onConflict: 'classId,studentId,date'
                        });

                    if (error) throw error;
                });

                await Promise.all(updates);

                return res.json({
                    success: true,
                    message: 'Attendance updated',
                    classId,
                    date: parsedDate,
                    count: Object.keys(records).length
                });
            }

            // Insert new records
            const insertData = Object.entries(records).map(([studentId, status]) => ({
                id: `ATT-${classId}-${studentId}-${parsedDate.replace(/-/g, '')}`,
                classId,
                schoolId,
                studentId,
                date: parsedDate,
                status,
                markedById,
                createdAt: new Date().toISOString()
            }));

            const { error } = await supabase
                .from('attendance_records')
                .insert(insertData);

            if (error) throw error;

            // Update student attendance percentage (aggregate)
            // This is a simple implementation - can be optimized with triggers
            for (const studentId of Object.keys(records)) {
                await updateStudentAttendancePercentage(supabase, studentId);
            }

            res.json({
                success: true,
                message: 'Attendance saved',
                classId,
                date: parsedDate,
                count: insertData.length
            });
        } catch (err) {
            console.error('Error saving attendance:', err);
            res.status(500).json({ error: err.message });
        }
    });

    // PUT - Update a single attendance record (admin correction)
    router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { status, notes } = req.body;

            const { error } = await supabase
                .from('attendance_records')
                .update({ status, notes, updatedAt: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;

            res.json({ success: true });
        } catch (err) {
            console.error('Error updating attendance:', err);
            res.status(500).json({ error: err.message });
        }
    });

    // DELETE - Remove attendance for a date (admin only, for corrections)
    router.delete('/:classId/:date', async (req, res) => {
        try {
            const { classId, date } = req.params;
            const parsedDate = new Date(date).toISOString().split('T')[0];

            const { error } = await supabase
                .from('attendance_records')
                .delete()
                .eq('classId', classId)
                .eq('date', parsedDate);

            if (error) throw error;

            res.json({ success: true, message: `Attendance for ${parsedDate} deleted` });
        } catch (err) {
            console.error('Error deleting attendance:', err);
            res.status(500).json({ error: err.message });
        }
    });

    return router;
};

// Helper: Update student's aggregate attendance percentage
async function updateStudentAttendancePercentage(supabase, studentId) {
    try {
        // Get all attendance for this student
        const { data: records } = await supabase
            .from('attendance_records')
            .select('status')
            .eq('studentId', studentId);

        if (!records || records.length === 0) return;

        const present = records.filter(r => r.status === 'PRESENT').length;
        const total = records.filter(r => r.status !== 'HOLIDAY' && r.status !== 'EXCUSED').length;
        const percentage = total > 0 ? Math.round((present / total) * 100) : 100;

        // Update student record
        await supabase
            .from('students')
            .update({ attendance: percentage })
            .eq('id', studentId);

    } catch (err) {
        console.error('Error updating student attendance percentage:', err);
    }
}

export default router;
