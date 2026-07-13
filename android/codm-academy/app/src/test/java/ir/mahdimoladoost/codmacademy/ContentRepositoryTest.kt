package ir.mahdimoladoost.codmacademy

import ir.mahdimoladoost.codmacademy.data.ContentRepository
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class ContentRepositoryTest {
    @Test
    fun courseAndLessonIdsAreUnique() {
        val courses = ContentRepository.courses
        val courseIds = courses.map { it.id }
        val lessonIds = courses.flatMap { course -> course.lessons.map { it.id } }

        assertEquals(courseIds.size, courseIds.toSet().size)
        assertEquals(lessonIds.size, lessonIds.toSet().size)
    }

    @Test
    fun everyCourseContainsUsefulOfflineContent() {
        ContentRepository.courses.forEach { course ->
            assertTrue(course.lessons.size >= 3)
            assertTrue(course.durationMinutes > 0)
            course.lessons.forEach { lesson ->
                assertTrue(lesson.sections.size >= 3)
                assertTrue(lesson.drill.isNotBlank())
            }
        }
    }

    @Test
    fun searchMatchesCourseCategoryAndLessonTitles() {
        val aimCourse = ContentRepository.courses.first { it.id == "aim-foundations" }

        assertTrue(aimCourse.matches("نشانه"))
        assertTrue(aimCourse.matches("حساسیت"))
        assertTrue(aimCourse.matches("روتین"))
    }
}
