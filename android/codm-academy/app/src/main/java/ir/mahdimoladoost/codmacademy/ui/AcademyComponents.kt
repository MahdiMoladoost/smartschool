package ir.mahdimoladoost.codmacademy.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.weight
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ir.mahdimoladoost.codmacademy.model.AppTab
import ir.mahdimoladoost.codmacademy.model.Course
import ir.mahdimoladoost.codmacademy.model.Lesson
import ir.mahdimoladoost.codmacademy.model.SkillCategory
import ir.mahdimoladoost.codmacademy.ui.theme.AppMuted
import ir.mahdimoladoost.codmacademy.ui.theme.AppPrimary
import ir.mahdimoladoost.codmacademy.ui.theme.AppSecondary
import ir.mahdimoladoost.codmacademy.ui.theme.AppSurface
import ir.mahdimoladoost.codmacademy.ui.theme.AppSurfaceRaised

@Composable
internal fun AcademyBottomBar(selectedTab: AppTab, onSelect: (AppTab) -> Unit) {
    Surface(
        color = AppSurface,
        tonalElevation = 8.dp,
        modifier = Modifier.windowInsetsPadding(WindowInsets.navigationBars)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().height(72.dp).padding(horizontal = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceAround
        ) {
            AppTab.entries.forEach { tab ->
                val selected = tab == selectedTab
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(16.dp))
                        .clickable { onSelect(tab) }
                        .padding(vertical = 8.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = tab.emoji,
                        color = if (selected) AppPrimary else AppMuted,
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = tab.title,
                        color = if (selected) AppPrimary else AppMuted,
                        fontSize = 11.sp,
                        fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal
                    )
                }
            }
        }
    }
}

@Composable
internal fun BrandHeader() {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Column {
            Text("آکادمی کالاف", fontSize = 24.sp, fontWeight = FontWeight.Black)
            Text("هر بازی، یک قدم حرفه‌ای‌تر", color = AppMuted, fontSize = 13.sp)
        }
        Box(
            modifier = Modifier.size(48.dp).clip(RoundedCornerShape(15.dp)).background(AppPrimary),
            contentAlignment = Alignment.Center
        ) {
            Text("＋", color = Color(0xFF00201A), fontSize = 26.sp, fontWeight = FontWeight.Black)
        }
    }
}

@Composable
internal fun HeroCard(onStart: () -> Unit) {
    Card(
        shape = RoundedCornerShape(28.dp),
        colors = CardDefaults.cardColors(containerColor = AppSurfaceRaised),
        border = BorderStroke(1.dp, Color(0xFF253648))
    ) {
        Column(Modifier.padding(24.dp)) {
            Surface(shape = RoundedCornerShape(50), color = AppPrimary.copy(alpha = .14f)) {
                Text(
                    "مسیر پیشنهادی این هفته",
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 7.dp),
                    color = AppPrimary,
                    fontWeight = FontWeight.Bold,
                    fontSize = 12.sp
                )
            }
            Spacer(Modifier.height(18.dp))
            Text("دقت بیشتر، تصمیم بهتر", fontSize = 28.sp, fontWeight = FontWeight.Black)
            Spacer(Modifier.height(8.dp))
            Text(
                "از تنظیم حساسیت شروع کن و با تمرین‌های کوتاه، نتیجه‌ات را در رنک قابل اندازه‌گیری کن.",
                color = AppMuted,
                lineHeight = 23.sp
            )
            Spacer(Modifier.height(20.dp))
            Button(
                onClick = onStart,
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(containerColor = AppPrimary)
            ) {
                Text("شروع مسیر  ←", fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
internal fun CategoryRow(onCategory: (SkillCategory) -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        SkillCategory.entries.forEach { category ->
            Surface(
                modifier = Modifier.width(104.dp).clickable { onCategory(category) },
                shape = RoundedCornerShape(20.dp),
                color = AppSurface,
                border = BorderStroke(1.dp, Color(0xFF263443))
            ) {
                Column(
                    modifier = Modifier.padding(vertical = 15.dp, horizontal = 10.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(category.emoji, fontSize = 24.sp)
                    Spacer(Modifier.height(6.dp))
                    Text(category.title, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
internal fun DetailTopBar(onBack: () -> Unit, favorite: Boolean, onFavorite: () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        TextButton(onClick = onBack) { Text("→ بازگشت") }
        TextButton(onClick = onFavorite) {
            Text(if (favorite) "♥ ذخیره شده" else "♡ ذخیره", color = if (favorite) AppSecondary else AppMuted)
        }
    }
}

@Composable
internal fun LessonRow(lesson: Lesson, completed: Boolean, index: Int, onClick: () -> Unit) {
    Surface(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick),
        shape = RoundedCornerShape(18.dp),
        color = AppSurface,
        border = BorderStroke(1.dp, if (completed) AppPrimary.copy(alpha = .45f) else Color(0xFF263443))
    ) {
        Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(
                Modifier.size(42.dp).clip(RoundedCornerShape(13.dp))
                    .background(if (completed) AppPrimary else AppSurfaceRaised),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    if (completed) "✓" else index.toString(),
                    color = if (completed) Color(0xFF00201A) else AppMuted,
                    fontWeight = FontWeight.Black
                )
            }
            Spacer(Modifier.width(13.dp))
            Column(Modifier.weight(1f)) {
                Text(lesson.title, fontWeight = FontWeight.Bold)
                Text("${lesson.durationMinutes} دقیقه", color = AppMuted, fontSize = 12.sp)
            }
            Text("←", color = AppMuted, fontSize = 20.sp)
        }
    }
}

@Composable
internal fun ContinueCard(course: Course, completedLessonIds: Set<String>, onClick: () -> Unit) {
    val done = course.lessons.count { it.id in completedLessonIds }
    val progress = done.toFloat() / course.lessons.size.coerceAtLeast(1)
    Surface(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick),
        shape = RoundedCornerShape(20.dp),
        color = Color(course.accent.toULong()).copy(alpha = .12f),
        border = BorderStroke(1.dp, Color(course.accent.toULong()).copy(alpha = .35f))
    ) {
        Column(Modifier.padding(18.dp)) {
            Text(course.title, fontWeight = FontWeight.Black, fontSize = 18.sp)
            Spacer(Modifier.height(6.dp))
            Text("$done از ${course.lessons.size} درس", color = AppMuted, fontSize = 12.sp)
            Spacer(Modifier.height(12.dp))
            LinearProgressIndicator(
                progress = { progress },
                modifier = Modifier.fillMaxWidth().height(7.dp).clip(CircleShape),
                color = Color(course.accent.toULong()),
                trackColor = Color(0xFF283646)
            )
        }
    }
}

@Composable
internal fun CourseCard(
    course: Course,
    completedLessonIds: Set<String>,
    favorite: Boolean,
    onClick: () -> Unit,
    onFavorite: (() -> Unit)? = null
) {
    val completed = course.lessons.count { it.id in completedLessonIds }
    Card(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick),
        shape = RoundedCornerShape(22.dp),
        colors = CardDefaults.cardColors(containerColor = AppSurface),
        border = BorderStroke(1.dp, Color(0xFF263443))
    ) {
        Row(Modifier.height(150.dp)) {
            Box(Modifier.width(8.dp).fillMaxHeight().background(Color(course.accent.toULong())))
            Column(
                modifier = Modifier.weight(1f).padding(17.dp),
                verticalArrangement = Arrangement.SpaceBetween
            ) {
                Row(verticalAlignment = Alignment.Top) {
                    Column(Modifier.weight(1f)) {
                        Text(
                            "${course.category.emoji} ${course.category.title}",
                            color = Color(course.accent.toULong()),
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(Modifier.height(6.dp))
                        Text(
                            course.title,
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Black,
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                    if (onFavorite != null) {
                        Text(
                            text = if (favorite) "♥" else "♡",
                            modifier = Modifier.clip(CircleShape).clickable(onClick = onFavorite).padding(8.dp),
                            color = if (favorite) AppSecondary else AppMuted,
                            fontSize = 20.sp
                        )
                    }
                }
                Text(
                    "${course.lessons.size} درس • ${course.durationMinutes} دقیقه${if (completed > 0) " • $completed انجام‌شده" else ""}",
                    color = AppMuted,
                    fontSize = 11.sp
                )
            }
        }
    }
}

@Composable
internal fun SectionTitle(title: String, action: String? = null, onAction: (() -> Unit)? = null) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(title, fontSize = 19.sp, fontWeight = FontWeight.Black)
        if (action != null && onAction != null) {
            Text(action, color = AppPrimary, fontSize = 12.sp, modifier = Modifier.clickable(onClick = onAction))
        }
    }
}

@Composable
internal fun StatCard(label: String, value: String, modifier: Modifier = Modifier) {
    Surface(modifier = modifier, shape = RoundedCornerShape(18.dp), color = AppSurface) {
        Column(Modifier.padding(18.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Text(value, fontSize = 25.sp, fontWeight = FontWeight.Black, color = AppPrimary)
            Text(label, color = AppMuted, fontSize = 12.sp)
        }
    }
}

@Composable
internal fun EmptyState(title: String, subtitle: String) {
    Column(
        modifier = Modifier.fillMaxWidth().padding(vertical = 48.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text("⌕", fontSize = 44.sp, color = AppMuted)
        Spacer(Modifier.height(12.dp))
        Text(title, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center)
        Text(subtitle, color = AppMuted, fontSize = 13.sp, textAlign = TextAlign.Center)
    }
}

@Composable
internal fun DisclaimerCard() {
    Surface(
        shape = RoundedCornerShape(16.dp),
        color = Color.Transparent,
        border = BorderStroke(1.dp, Color(0xFF2A3746))
    ) {
        Text(
            "این برنامه یک راهنمای آموزشی مستقل و غیررسمی است و وابستگی یا تأیید رسمی از Activision یا Call of Duty ندارد.",
            modifier = Modifier.padding(14.dp),
            color = AppMuted,
            fontSize = 11.sp,
            lineHeight = 18.sp
        )
    }
}

@Composable
internal fun categoryChipColors() = FilterChipDefaults.filterChipColors(
    selectedContainerColor = AppPrimary.copy(alpha = .18f),
    selectedLabelColor = AppPrimary,
    containerColor = AppSurface,
    labelColor = AppMuted
)
