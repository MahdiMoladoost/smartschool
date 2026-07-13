package ir.mahdimoladoost.codmacademy.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import ir.mahdimoladoost.codmacademy.data.ContentRepository
import ir.mahdimoladoost.codmacademy.data.ProgressStore
import ir.mahdimoladoost.codmacademy.model.AppTab
import ir.mahdimoladoost.codmacademy.model.Course
import ir.mahdimoladoost.codmacademy.model.SkillCategory
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

data class AcademyUiState(
    val courses: List<Course> = ContentRepository.courses,
    val currentTab: AppTab = AppTab.HOME,
    val query: String = "",
    val selectedCategory: SkillCategory? = null,
    val favoriteCourseIds: Set<String> = emptySet(),
    val completedLessonIds: Set<String> = emptySet(),
    val lastCourseId: String? = null,
    val selectedCourseId: String? = null,
    val selectedLessonId: String? = null
) {
    val filteredCourses: List<Course>
        get() = courses.filter { course ->
            (selectedCategory == null || course.category == selectedCategory) && course.matches(query)
        }

    val completedCount: Int get() = completedLessonIds.size
    val lessonCount: Int get() = courses.sumOf { it.lessons.size }
}

class AcademyViewModel(application: Application) : AndroidViewModel(application) {
    private val progressStore = ProgressStore(application)
    private val _uiState = MutableStateFlow(
        AcademyUiState(
            favoriteCourseIds = progressStore.favoriteCourseIds(),
            completedLessonIds = progressStore.completedLessonIds(),
            lastCourseId = progressStore.lastCourseId()
        )
    )
    val uiState: StateFlow<AcademyUiState> = _uiState.asStateFlow()

    fun selectTab(tab: AppTab) {
        _uiState.update {
            it.copy(
                currentTab = tab,
                selectedCourseId = null,
                selectedLessonId = null,
                query = if (tab == AppTab.COURSES) it.query else ""
            )
        }
    }

    fun updateQuery(query: String) = _uiState.update { it.copy(query = query) }

    fun selectCategory(category: SkillCategory?) =
        _uiState.update { it.copy(selectedCategory = category) }

    fun openCourse(courseId: String) {
        progressStore.setLastCourse(courseId)
        _uiState.update {
            it.copy(lastCourseId = courseId, selectedCourseId = courseId, selectedLessonId = null)
        }
    }

    fun openLesson(lessonId: String) = _uiState.update { it.copy(selectedLessonId = lessonId) }

    fun closeDetail() {
        _uiState.update {
            if (it.selectedLessonId != null) it.copy(selectedLessonId = null)
            else it.copy(selectedCourseId = null)
        }
    }

    fun toggleFavorite(courseId: String) {
        val isFavorite = courseId in _uiState.value.favoriteCourseIds
        val updated = progressStore.setCourseFavorite(courseId, !isFavorite)
        _uiState.update { it.copy(favoriteCourseIds = updated) }
    }

    fun toggleLessonComplete(lessonId: String) {
        val isCompleted = lessonId in _uiState.value.completedLessonIds
        val updated = progressStore.setLessonCompleted(lessonId, !isCompleted)
        _uiState.update { it.copy(completedLessonIds = updated) }
    }
}
