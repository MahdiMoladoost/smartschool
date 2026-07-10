import { query, queryOne, execute } from '../config/database.js';
import { logAdminAction } from '../middleware/security.js';

// ==========================================
// AI QUESTION GENERATOR
// ==========================================

// تنظیمات هوش مصنوعی برای تولید سوال
async function getAISettings() {
    const settings = await query('SELECT setting_key, setting_value FROM settings WHERE setting_key LIKE "ai_%"');
    const aiSettings = {};
    settings.forEach(s => {
        aiSettings[s.setting_key] = s.setting_value;
    });
    return aiSettings;
}

// تولید سوالات با هوش مصنوعی
async function generateQuestionsWithAI(topic, numberOfQuestions, difficulty, courseName) {
    try {
        const settings = await getAISettings();
        
        if (settings.ai_enabled !== 'true') {
            throw new Error('هوش مصنوعی غیرفعال است');
        }
        
        const difficultyMap = {
            easy: 'آسان',
            medium: 'متوسط',
            hard: 'سخت'
        };
        
        const prompt = `به عنوان یک طراح سوالات آموزشی حرفه‌ای، یک آزمون چهارگزینه‌ای درباره "${topic}" برای درس "${courseName}" طراحی کن.
        
مشخصات آزمون:
- تعداد سوالات: ${numberOfQuestions}
- سطح دشواری: ${difficultyMap[difficulty] || 'متوسط'}
- هر سوال باید کاملاً مرتبط با موضوع "${topic}" باشد
- پاسخ صحیح را با حرف (A, B, C, D) مشخص کن

فرمت خروجی JSON:
{
    "questions": [
        {
            "question": "متن سوال",
            "options": ["گزینه اول", "گزینه دوم", "گزینه سوم", "گزینه چهارم"],
            "correct": "A",
            "explanation": "توضیح کوتاه درباره پاسخ صحیح"
        }
    ]
}

نکات مهم:
- سوالات باید متنوع و چالش‌برانگیز باشند
- پاسخ‌های غلط باید منطقی و نزدیک به پاسخ صحیح باشند
- توضیحات باید مختصر و مفید باشد
- تمام متن‌ها به فارسی باشد`;

        const response = await fetch(settings.ai_api_url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${settings.ai_api_key}`
            },
            body: JSON.stringify({
                model: settings.ai_model,
                messages: [
                    { role: 'system', content: 'تو یک طراح سوالات آموزشی حرفه‌ای هستی. فقط JSON معتبر برگردان.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 4000
            })
        });
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }
        
        const data = await response.json();
        const content = data.choices[0].message.content;
        
        // استخراج JSON از پاسخ
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('فرمت پاسخ نامعتبر است');
        }
        
        const questions = JSON.parse(jsonMatch[0]);
        return questions.questions;
        
    } catch (error) {
        console.error('خطا در تولید سوالات:', error);
        throw error;
    }
}

// ==========================================
// EXAMS CRUD
// ==========================================

// دریافت لیست آزمون‌ها (برای معلم)
export async function getExams(req, res) {
    try {
        const teacherId = req.user.id;
        const { class_id, status } = req.query;
        
        let sql = `
            SELECT e.*, 
                   c.name as course_name,
                   cls.name as class_name,
                   (SELECT COUNT(*) FROM exam_results WHERE exam_id = e.id) as participants_count,
                   (SELECT AVG(score) FROM exam_results WHERE exam_id = e.id) as avg_score
            FROM exams e
            JOIN courses c ON c.id = e.course_id
            JOIN classes cls ON cls.id = e.class_id
            WHERE e.teacher_id = ?
        `;
        const params = [teacherId];
        
        if (class_id) {
            sql += ` AND e.class_id = ?`;
            params.push(class_id);
        }
        
        if (status === 'published') {
            sql += ` AND e.is_published = 1`;
        } else if (status === 'draft') {
            sql += ` AND e.is_published = 0`;
        }
        
        sql += ` ORDER BY e.created_at DESC`;
        
        const exams = await query(sql, params);
        
        res.json({
            success: true,
            exams
        });
    } catch (error) {
        console.error('خطا در دریافت آزمون‌ها:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

// دریافت یک آزمون خاص
export async function getExamById(req, res) {
    try {
        const { id } = req.params;
        
        const exam = await queryOne(`
            SELECT e.*, 
                   c.name as course_name,
                   cls.name as class_name,
                   u.name as teacher_name
            FROM exams e
            JOIN courses c ON c.id = e.course_id
            JOIN classes cls ON cls.id = e.class_id
            JOIN users u ON u.id = e.teacher_id
            WHERE e.id = ?
        `, [id]);
        
        if (!exam) {
            return res.status(404).json({ error: 'آزمون یافت نشد' });
        }
        
        // اگر معلم است، باید مالک باشد
        if (req.user.role === 'teacher' && exam.teacher_id !== req.user.id) {
            return res.status(403).json({ error: 'شما دسترسی به این آزمون ندارید' });
        }
        
        // Parse questions JSON
        if (exam.questions) {
            exam.questions = typeof exam.questions === 'string' 
                ? JSON.parse(exam.questions) 
                : exam.questions;
        }
        
        res.json({
            success: true,
            exam
        });
    } catch (error) {
        console.error('خطا:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

// دریافت کلاس‌ها و دروس معلم برای انتخاب در فرم
export async function getTeacherCoursesAndClasses(req, res) {
    try {
        const teacherId = req.user.id;
        
        // کلاس‌هایی که معلم در آنها تدریس می‌کند
        const classes = await query(`
            SELECT DISTINCT c.*
            FROM classes c
            JOIN courses co ON co.class_id = c.id
            WHERE co.teacher_id = ?
        `, [teacherId]);
        
        // دروسی که معلم تدریس می‌کند
        const courses = await query(`
            SELECT DISTINCT co.*, c.name as class_name
            FROM courses co
            JOIN classes c ON c.id = co.class_id
            WHERE co.teacher_id = ?
        `, [teacherId]);
        
        res.json({
            success: true,
            classes,
            courses
        });
    } catch (error) {
        console.error('خطا:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

// ایجاد آزمون جدید با هوش مصنوعی
export async function createExamWithAI(req, res) {
    try {
        const { 
            title, 
            course_id, 
            class_id, 
            description, 
            exam_date, 
            duration,
            topic,
            question_count,
            difficulty
        } = req.body;
        
        if (!title || !course_id || !class_id || !topic) {
            return res.status(400).json({ 
                error: 'عنوان، درس، کلاس و موضوع آزمون الزامی است' 
            });
        }
        
        // دریافت اطلاعات درس
        const course = await queryOne('SELECT name FROM courses WHERE id = ?', [course_id]);
        if (!course) {
            return res.status(404).json({ error: 'درس یافت نشد' });
        }
        
        // تولید سوالات با هوش مصنوعی
        const questionCount = Math.min(question_count || 10, 100);
        const questions = await generateQuestionsWithAI(
            topic, 
            questionCount, 
            difficulty || 'medium',
            course.name
        );
        
        // ذخیره در دیتابیس
        const result = await execute(`
            INSERT INTO exams (title, course_id, class_id, teacher_id, description, 
                               exam_date, duration, total_points, questions, 
                               difficulty, is_published)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            title,
            course_id,
            class_id,
            req.user.id,
            description || null,
            exam_date || null,
            duration || 60,
            questionCount * 10, // هر سوال 10 نمره
            JSON.stringify(questions),
            difficulty || 'medium',
            false
        ]);
        
        // لاگ فعالیت
        await logAdminAction(
            req.user.id,
            'create_exam_with_ai',
            'exam',
            result.insertId,
            { title, course_id, class_id, question_count: questionCount },
            req.ip
        );
        
        res.json({
            success: true,
            message: 'آزمون با موفقیت ساخته شد',
            exam_id: result.insertId,
            questions: questions // برای پیش‌نمایش در فرانت‌اند
        });
        
    } catch (error) {
        console.error('خطا در ساخت آزمون:', error);
        res.status(500).json({ 
            error: 'خطا در ساخت آزمون: ' + (error.message || 'لطفاً دوباره تلاش کنید') 
        });
    }
}

// ویرایش آزمون
export async function updateExam(req, res) {
    try {
        const { id } = req.params;
        const { title, description, exam_date, duration, is_published } = req.body;
        
        const existing = await queryOne('SELECT * FROM exams WHERE id = ?', [id]);
        if (!existing) {
            return res.status(404).json({ error: 'آزمون یافت نشد' });
        }
        
        // فقط معلم مالک می‌تواند ویرایش کند
        if (existing.teacher_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'شما دسترسی ویرایش این آزمون را ندارید' });
        }
        
        await execute(`
            UPDATE exams 
            SET title = COALESCE(?, title),
                description = COALESCE(?, description),
                exam_date = COALESCE(?, exam_date),
                duration = COALESCE(?, duration),
                is_published = COALESCE(?, is_published)
            WHERE id = ?
        `, [title, description, exam_date, duration, is_published, id]);
        
        res.json({
            success: true,
            message: 'آزمون با موفقیت به‌روزرسانی شد'
        });
    } catch (error) {
        console.error('خطا:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

// حذف آزمون
export async function deleteExam(req, res) {
    try {
        const { id } = req.params;
        
        const existing = await queryOne('SELECT * FROM exams WHERE id = ?', [id]);
        if (!existing) {
            return res.status(404).json({ error: 'آزمون یافت نشد' });
        }
        
        // فقط معلم مالک می‌تواند حذف کند
        if (existing.teacher_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'شما دسترسی حذف این آزمون را ندارید' });
        }
        
        await execute('DELETE FROM exams WHERE id = ?', [id]);
        
        res.json({
            success: true,
            message: 'آزمون با موفقیت حذف شد'
        });
    } catch (error) {
        console.error('خطا:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

// انتشار آزمون
export async function publishExam(req, res) {
    try {
        const { id } = req.params;
        
        const existing = await queryOne('SELECT * FROM exams WHERE id = ?', [id]);
        if (!existing) {
            return res.status(404).json({ error: 'آزمون یافت نشد' });
        }
        
        if (existing.teacher_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'شما دسترسی انتشار این آزمون را ندارید' });
        }
        
        await execute('UPDATE exams SET is_published = 1 WHERE id = ?', [id]);
        
        res.json({
            success: true,
            message: 'آزمون با موفقیت منتشر شد'
        });
    } catch (error) {
        console.error('خطا:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

// ==========================================
// STUDENT EXAM TAKING
// ==========================================

// دریافت آزمون‌های منتشر شده برای دانش‌آموز
export async function getStudentExams(req, res) {
    try {
        const studentId = req.user.id;
        
        // پیدا کردن کلاس دانش‌آموز
        const studentClass = await queryOne(`
            SELECT class_id FROM class_students 
            WHERE student_id = ? AND status = 'active'
        `, [studentId]);
        
        if (!studentClass) {
            return res.json({ success: true, exams: [] });
        }
        
        const exams = await query(`
            SELECT e.*, 
                   c.name as course_name,
                   (SELECT score FROM exam_results 
                    WHERE exam_id = e.id AND student_id = ?) as my_score,
                   (SELECT submitted_at FROM exam_results 
                    WHERE exam_id = e.id AND student_id = ?) as submitted_at
            FROM exams e
            JOIN courses c ON c.id = e.course_id
            WHERE e.class_id = ? AND e.is_published = 1
            ORDER BY e.exam_date ASC, e.created_at DESC
        `, [studentId, studentId, studentClass.class_id]);
        
        res.json({
            success: true,
            exams
        });
    } catch (error) {
        console.error('خطا:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

// دریافت یک آزمون برای شرکت
export async function getExamForTaking(req, res) {
    try {
        const { id } = req.params;
        const studentId = req.user.id;
        
        // بررسی اینکه دانش‌آموز قبلاً در این آزمون شرکت کرده
        const existingResult = await queryOne(`
            SELECT * FROM exam_results 
            WHERE exam_id = ? AND student_id = ?
        `, [id, studentId]);
        
        if (existingResult) {
            return res.status(400).json({ 
                error: 'شما قبلاً در این آزمون شرکت کرده‌اید',
                result: existingResult
            });
        }
        
        const exam = await queryOne(`
            SELECT e.*, c.name as course_name
            FROM exams e
            JOIN courses c ON c.id = e.course_id
            WHERE e.id = ? AND e.is_published = 1
        `, [id]);
        
        if (!exam) {
            return res.status(404).json({ error: 'آزمون یافت نشد' });
        }
        
        // Parse questions
        exam.questions = typeof exam.questions === 'string' 
            ? JSON.parse(exam.questions) 
            : exam.questions;
        
        res.json({
            success: true,
            exam: {
                id: exam.id,
                title: exam.title,
                description: exam.description,
                duration: exam.duration,
                total_points: exam.total_points,
                course_name: exam.course_name,
                questions: exam.questions
            }
        });
    } catch (error) {
        console.error('خطا:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

// ارسال پاسخ‌های دانش‌آموز
export async function submitExam(req, res) {
    try {
        const { id } = req.params;
        const { answers } = req.body;
        const studentId = req.user.id;
        
        // بررسی اینکه دانش‌آموز قبلاً شرکت نکرده باشد
        const existingResult = await queryOne(`
            SELECT * FROM exam_results 
            WHERE exam_id = ? AND student_id = ?
        `, [id, studentId]);
        
        if (existingResult) {
            return res.status(400).json({ error: 'شما قبلاً در این آزمون شرکت کرده‌اید' });
        }
        
        // دریافت اطلاعات آزمون
        const exam = await queryOne('SELECT * FROM exams WHERE id = ? AND is_published = 1', [id]);
        if (!exam) {
            return res.status(404).json({ error: 'آزمون یافت نشد' });
        }
        
        const questions = typeof exam.questions === 'string' 
            ? JSON.parse(exam.questions) 
            : exam.questions;
        
        // تصحیح آزمون
        let correctCount = 0;
        const correctedAnswers = [];
        
        for (let i = 0; i < questions.length; i++) {
            const question = questions[i];
            const userAnswer = answers[i];
            const isCorrect = userAnswer === question.correct;
            
            if (isCorrect) {
                correctCount++;
            }
            
            correctedAnswers.push({
                question: question.question,
                userAnswer: userAnswer,
                correctAnswer: question.correct,
                isCorrect: isCorrect,
                explanation: question.explanation
            });
        }
        
        const scorePerQuestion = exam.total_points / questions.length;
        const totalScore = (correctCount * scorePerQuestion).toFixed(2);
        
        // ذخیره نتیجه
        const result = await execute(`
            INSERT INTO exam_results (exam_id, student_id, score, total_points, answers, submitted_at)
            VALUES (?, ?, ?, ?, ?, NOW())
        `, [id, studentId, totalScore, exam.total_points, JSON.stringify(correctedAnswers)]);
        
        res.json({
            success: true,
            message: 'آزمون با موفقیت تصحیح شد',
            result: {
                score: totalScore,
                total: exam.total_points,
                correct_count: correctCount,
                total_questions: questions.length,
                percentage: ((correctCount / questions.length) * 100).toFixed(1),
                answers: correctedAnswers
            }
        });
    } catch (error) {
        console.error('خطا در تصحیح آزمون:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

// دریافت نتایج آزمون‌های دانش‌آموز
export async function getStudentExamResults(req, res) {
    try {
        const studentId = req.user.id;
        
        const results = await query(`
            SELECT er.*, e.title as exam_title, c.name as course_name
            FROM exam_results er
            JOIN exams e ON e.id = er.exam_id
            JOIN courses c ON c.id = e.course_id
            WHERE er.student_id = ?
            ORDER BY er.submitted_at DESC
        `, [studentId]);
        
        // Parse answers JSON
        for (const result of results) {
            if (result.answers) {
                result.answers = typeof result.answers === 'string' 
                    ? JSON.parse(result.answers) 
                    : result.answers;
            }
        }
        
        res.json({
            success: true,
            results
        });
    } catch (error) {
        console.error('خطا:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}

// دریافت آمار یک آزمون (برای معلم)
export async function getExamStatistics(req, res) {
    try {
        const { id } = req.params;
        
        const exam = await queryOne('SELECT * FROM exams WHERE id = ?', [id]);
        if (!exam) {
            return res.status(404).json({ error: 'آزمون یافت نشد' });
        }
        
        // فقط معلم مالک یا ادمین می‌تواند ببیند
        if (exam.teacher_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'دسترسی محدود' });
        }
        
        const statistics = await queryOne(`
            SELECT 
                COUNT(*) as participants,
                AVG(score) as avg_score,
                MIN(score) as min_score,
                MAX(score) as max_score,
                SUM(CASE WHEN score >= (total_points * 0.7) THEN 1 ELSE 0 END) as passed_count,
                SUM(CASE WHEN score < (total_points * 0.5) THEN 1 ELSE 0 END) as failed_count
            FROM exam_results
            WHERE exam_id = ?
        `, [id]);
        
        // توزیع نمرات
        const distribution = await query(`
            SELECT 
                CASE 
                    WHEN score / total_points >= 0.9 THEN 'عالی (90-100%)'
                    WHEN score / total_points >= 0.7 THEN 'خوب (70-89%)'
                    WHEN score / total_points >= 0.5 THEN 'متوسط (50-69%)'
                    ELSE 'ضعیف (کمتر از 50%)'
                END as level,
                COUNT(*) as count
            FROM exam_results
            WHERE exam_id = ?
            GROUP BY level
        `, [id]);
        
        res.json({
            success: true,
            statistics,
            distribution
        });
    } catch (error) {
        console.error('خطا:', error);
        res.status(500).json({ error: 'خطای سرور' });
    }
}