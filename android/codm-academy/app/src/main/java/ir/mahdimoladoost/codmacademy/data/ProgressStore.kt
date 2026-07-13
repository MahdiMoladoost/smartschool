package ir.mahdimoladoost.codmacademy.data

import android.content.Context

class ProgressStore(context: Context) {
    private val preferences = context.getSharedPreferences("academy_progress", Context.MODE_PRIVATE)

    fun favoriteCourseIds(): Set<String> =
        preferences.getStringSet(KEY_FAVORITES, emptySet()).orEmpty().toSet()

    fun completedLessonIds(): Set<String> =
        preferences.getStringSet(KEY_COMPLETED, emptySet()).orEmpty().toSet()

    fun lastCourseId(): String? = preferences.getString(KEY_LAST_COURSE, null)

    fun setCourseFavorite(courseId: String, favorite: Boolean): Set<String> {
        val updated = favoriteCourseIds().toMutableSet().apply {
            if (favorite) add(courseId) else remove(courseId)
        }
        preferences.edit().putStringSet(KEY_FAVORITES, updated).apply()
        return updated
    }

    fun setLessonCompleted(lessonId: String, completed: Boolean): Set<String> {
        val updated = completedLessonIds().toMutableSet().apply {
            if (completed) add(lessonId) else remove(lessonId)
        }
        preferences.edit().putStringSet(KEY_COMPLETED, updated).apply()
        return updated
    }

    fun setLastCourse(courseId: String) {
        preferences.edit().putString(KEY_LAST_COURSE, courseId).apply()
    }

    companion object {
        private const val KEY_FAVORITES = "favorite_course_ids"
        private const val KEY_COMPLETED = "completed_lesson_ids"
        private const val KEY_LAST_COURSE = "last_course_id"
    }
}
