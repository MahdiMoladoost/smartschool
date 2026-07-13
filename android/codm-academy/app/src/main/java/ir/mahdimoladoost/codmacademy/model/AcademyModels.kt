package ir.mahdimoladoost.codmacademy.model

enum class SkillCategory(val title: String, val emoji: String) {
    AIM("نشانه‌گیری", "🎯"),
    MOVEMENT("حرکت", "⚡"),
    GAME_SENSE("گیم‌سنس", "🧠"),
    LOADOUT("لوداوت", "🛠"),
    RANKED("رنک", "🏆"),
    BATTLE_ROYALE("بتل رویال", "🪂")
}

data class Lesson(
    val id: String,
    val title: String,
    val durationMinutes: Int,
    val objective: String,
    val sections: List<String>,
    val drill: String
)

data class Course(
    val id: String,
    val title: String,
    val subtitle: String,
    val category: SkillCategory,
    val level: String,
    val accent: Long,
    val lessons: List<Lesson>,
    val featured: Boolean = false
) {
    val durationMinutes: Int get() = lessons.sumOf { it.durationMinutes }

    fun matches(query: String): Boolean {
        val normalized = query.trim()
        return normalized.isBlank() ||
            title.contains(normalized, ignoreCase = true) ||
            subtitle.contains(normalized, ignoreCase = true) ||
            category.title.contains(normalized, ignoreCase = true) ||
            lessons.any { it.title.contains(normalized, ignoreCase = true) }
    }
}

enum class AppTab(val title: String, val emoji: String) {
    HOME("خانه", "⌂"),
    COURSES("آموزش‌ها", "▤"),
    FAVORITES("ذخیره‌ها", "♡"),
    PROFILE("پروفایل", "◎")
}
