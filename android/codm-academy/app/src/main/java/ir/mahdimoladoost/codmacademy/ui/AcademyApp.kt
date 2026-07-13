package ir.mahdimoladoost.codmacademy.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import ir.mahdimoladoost.codmacademy.data.ContentRepository
import ir.mahdimoladoost.codmacademy.model.AppTab
import ir.mahdimoladoost.codmacademy.model.Course
import ir.mahdimoladoost.codmacademy.model.Lesson
import ir.mahdimoladoost.codmacademy.model.SkillCategory
import ir.mahdimoladoost.codmacademy.ui.theme.AppBackground
import ir.mahdimoladoost.codmacademy.ui.theme.AppMuted
import ir.mahdimoladoost.codmacademy.ui.theme.AppPrimary
import ir.mahdimoladoost.codmacademy.ui.theme.AppSecondary
import ir.mahdimoladoost.codmacademy.ui.theme.AppSurface
import ir.mahdimoladoost.codmacademy.ui.theme.AppSurfaceRaised

@Composable
fun AcademyApp(viewModel: AcademyViewModel) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val selectedCourse = ContentRepository.course(state.selectedCourseId)
    val selectedLesson = selectedCourse?.lessons?.firstOrNull { it.id == state.selectedLessonId }

    CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Rtl) {
        Scaffold(
            modifier = Modifier.fillMaxSize(),
            containerColor = AppBackground,
            contentWindowInsets = WindowInsets.safeDrawing,
            bottomBar = {
                if (selectedCourse == null) {
                    AcademyBottomBar(state.currentTab, viewModel::selectTab)
                }
            }
        ) { padding ->
            when {
                selectedCourse != null && selectedLesson != null -> LessonDetailScreen(
                    course = selectedCourse,
                    lesson = selectedLesson,
                    isCompleted = selectedLesson.id in state.completedLessonIds,
                    onBack = viewModel::closeDetail,
                    onToggleComplete = { viewModel.toggleLessonComplete(selectedLesson.id) },
                    modifier = Modifier.padding(padding)
                )

                selectedCourse != null -> CourseDetailScreen(
                    course = selectedCourse,
                    favorite = selectedCourse.id in state.favoriteCourseIds,
                    completedLessonIds = state.completedLessonIds,
                    onBack = viewModel::closeDetail,
                    onFavorite = { viewModel.toggleFavorite(selectedCourse.id) },
                    onLesson = viewModel::openLesson,
                    modifier = Modifier.padding(padding)
                )

                state.currentTab == AppTab.HOME -> HomeScreen(
                    state = state,
                    onCourse = viewModel::openCourse,
                    onCategory = {
                        viewModel.selectCategory(it)
                        viewModel.selectTab(AppTab.COURSES)
                    },
                    onSeeAll = { viewModel.selectTab(AppTab.COURSES) },
                    modifier = Modifier.padding(padding)
                )

                state.currentTab == AppTab.COURSES -> CoursesScreen(
                    state = state,
                    onQuery = viewModel::updateQuery,
                    onCategory = viewModel::selectCategory,
                    onCourse = viewModel::openCourse,
                    onFavorite = viewModel::toggleFavorite,
                    modifier = Modifier.padding(padding)
                )

                state.currentTab == AppTab.FAVORITES -> FavoritesScreen(
                    courses = state.courses.filter { it.id in state.favoriteCourseIds },
                    completedLessonIds = state.completedLessonIds,
                    onCourse = viewModel::openCourse,
                    onBrowse = { viewModel.selectTab(AppTab.COURSES) },
                    modifier = Modifier.padding(padding)
                )

                else -> ProfileScreen(
                    state = state,
                    onContinue = state.lastCourseId?.let { id -> { viewModel.openCourse(id) } },
                    modifier = Modifier.padding(padding)
                )
            }
        }
    }
}

@Composable
private fun HomeScreen(
    state: AcademyUiState,
    onCourse: (String) -> Unit,
    onCategory: (SkillCategory) -> Unit,
    onSeeAll: () -> Unit,
    modifier: Modifier = Modifier
) {
    val continueCourse = ContentRepository.course(state.lastCourseId)
    LazyColumn(
        modifier = modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = 20.dp, vertical = 20.dp),
        verticalArrangement = Arrangement.spacedBy(18.dp)
    ) {
        item { BrandHeader() }
        item { HeroCard(onStart = { onCourse(state.courses.first().id) }) }
        item {
            SectionTitle(title = "مسیرهای مهارتی", action = "همه دوره‌ها", onAction = onSeeAll)
            Spacer(Modifier.height(12.dp))
            CategoryRow(onCategory)
        }
        if (continueCourse != null) {
            item {
                SectionTitle("ادامه یادگیری")
                Spacer(Modifier.height(12.dp))
                ContinueCard(
                    course = continueCourse,
                    completedLessonIds = state.completedLessonIds,
                    onClick = { onCourse(continueCourse.id) }
                )
            }
        }
        item { SectionTitle("پیشنهاد برای شروع") }
        items(state.courses.filter { it.featured }, key = { it.id }) { course ->
            CourseCard(
                course = course,
                completedLessonIds = state.completedLessonIds,
                favorite = course.id in state.favoriteCourseIds,
                onClick = { onCourse(course.id) }
            )
        }
        item { DisclaimerCard() }
    }
}

@Composable
private fun CoursesScreen(
    state: AcademyUiState,
    onQuery: (String) -> Unit,
    onCategory: (SkillCategory?) -> Unit,
    onCourse: (String) -> Unit,
    onFavorite: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    Column(modifier.fillMaxSize()) {
        Column(Modifier.padding(horizontal = 20.dp, vertical = 18.dp)) {
            Text("آموزش‌ها", fontSize = 28.sp, fontWeight = FontWeight.Black)
            Spacer(Modifier.height(14.dp))
            OutlinedTextField(
                value = state.query,
                onValueChange = onQuery,
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                shape = RoundedCornerShape(16.dp),
                placeholder = { Text("جست‌وجوی دوره یا مهارت…") },
                leadingIcon = { Text("⌕", fontSize = 22.sp) },
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = AppPrimary,
                    unfocusedBorderColor = Color(0xFF334252),
                    focusedContainerColor = AppSurface,
                    unfocusedContainerColor = AppSurface
                )
            )
            Spacer(Modifier.height(12.dp))
            Row(
                modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                FilterChip(
                    selected = state.selectedCategory == null,
                    onClick = { onCategory(null) },
                    label = { Text("همه") },
                    colors = categoryChipColors()
                )
                SkillCategory.entries.forEach { category ->
                    FilterChip(
                        selected = state.selectedCategory == category,
                        onClick = { onCategory(category) },
                        label = { Text("${category.emoji} ${category.title}") },
                        colors = categoryChipColors()
                    )
                }
            }
        }
        LazyColumn(
            contentPadding = PaddingValues(start = 20.dp, end = 20.dp, bottom = 20.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            if (state.filteredCourses.isEmpty()) {
                item { EmptyState("دوره‌ای با این جست‌وجو پیدا نشد.", "عبارت یا دسته‌بندی را تغییر بده.") }
            }
            items(state.filteredCourses, key = { it.id }) { course ->
                CourseCard(
                    course = course,
                    completedLessonIds = state.completedLessonIds,
                    favorite = course.id in state.favoriteCourseIds,
                    onClick = { onCourse(course.id) },
                    onFavorite = { onFavorite(course.id) }
                )
            }
        }
    }
}

@Composable
private fun FavoritesScreen(
    courses: List<Course>,
    completedLessonIds: Set<String>,
    onCourse: (String) -> Unit,
    onBrowse: () -> Unit,
    modifier: Modifier = Modifier
) {
    LazyColumn(
        modifier = modifier.fillMaxSize(),
        contentPadding = PaddingValues(20.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            Text("ذخیره‌های من", fontSize = 28.sp, fontWeight = FontWeight.Black)
            Text("دوره‌هایی که برای مرور سریع نگه داشته‌ای", color = AppMuted)
        }
        if (courses.isEmpty()) {
            item {
                EmptyState("هنوز دوره‌ای ذخیره نکرده‌ای.", "از صفحه آموزش‌ها روی نشان قلب بزن.")
                Spacer(Modifier.height(10.dp))
                Button(onClick = onBrowse, modifier = Modifier.fillMaxWidth()) { Text("دیدن آموزش‌ها") }
            }
        }
        items(courses, key = { it.id }) { course ->
            CourseCard(
                course = course,
                completedLessonIds = completedLessonIds,
                favorite = true,
                onClick = { onCourse(course.id) }
            )
        }
    }
}

@Composable
private fun ProfileScreen(
    state: AcademyUiState,
    onContinue: (() -> Unit)?,
    modifier: Modifier = Modifier
) {
    val fraction = if (state.lessonCount == 0) 0f else state.completedCount.toFloat() / state.lessonCount
    Column(
        modifier = modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(18.dp)
    ) {
        Text("پروفایل تمرینی", fontSize = 28.sp, fontWeight = FontWeight.Black)
        Card(
            colors = CardDefaults.cardColors(containerColor = AppSurfaceRaised),
            shape = RoundedCornerShape(24.dp)
        ) {
            Column(Modifier.padding(22.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        Modifier.size(62.dp).clip(CircleShape).background(AppPrimary),
                        contentAlignment = Alignment.Center
                    ) {
                        Text("M", color = Color(0xFF00201A), fontSize = 26.sp, fontWeight = FontWeight.Black)
                    }
                    Spacer(Modifier.width(14.dp))
                    Column {
                        Text("بازیکن آکادمی", fontSize = 20.sp, fontWeight = FontWeight.Bold)
                        Text("مسیر رشد شخصی", color = AppMuted)
                    }
                }
                Spacer(Modifier.height(24.dp))
                Text("${state.completedCount} از ${state.lessonCount} درس تکمیل شده", fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(10.dp))
                LinearProgressIndicator(
                    progress = { fraction },
                    modifier = Modifier.fillMaxWidth().height(9.dp).clip(CircleShape),
                    color = AppPrimary,
                    trackColor = Color(0xFF283646)
                )
            }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            StatCard("درس کامل", state.completedCount.toString(), Modifier.weight(1f))
            StatCard("ذخیره‌ها", state.favoriteCourseIds.size.toString(), Modifier.weight(1f))
        }
        if (onContinue != null) {
            Button(
                onClick = onContinue,
                modifier = Modifier.fillMaxWidth().height(52.dp),
                shape = RoundedCornerShape(16.dp)
            ) { Text("ادامه آخرین دوره", fontWeight = FontWeight.Bold) }
        }
        DisclaimerCard()
    }
}

@Composable
private fun CourseDetailScreen(
    course: Course,
    favorite: Boolean,
    completedLessonIds: Set<String>,
    onBack: () -> Unit,
    onFavorite: () -> Unit,
    onLesson: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    LazyColumn(
        modifier = modifier.fillMaxSize(),
        contentPadding = PaddingValues(20.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item { DetailTopBar(onBack, favorite, onFavorite) }
        item {
            Card(
                shape = RoundedCornerShape(28.dp),
                colors = CardDefaults.cardColors(containerColor = Color(course.accent.toULong()).copy(alpha = .16f)),
                border = BorderStroke(1.dp, Color(course.accent.toULong()).copy(alpha = .38f))
            ) {
                Column(Modifier.padding(24.dp)) {
                    Text("${course.category.emoji}  ${course.category.title}", color = Color(course.accent.toULong()), fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(14.dp))
                    Text(course.title, fontSize = 29.sp, fontWeight = FontWeight.Black, lineHeight = 36.sp)
                    Spacer(Modifier.height(10.dp))
                    Text(course.subtitle, color = AppMuted, lineHeight = 23.sp)
                    Spacer(Modifier.height(18.dp))
                    Text("${course.lessons.size} درس  •  ${course.durationMinutes} دقیقه  •  ${course.level}", fontSize = 12.sp)
                }
            }
        }
        item { SectionTitle("فهرست درس‌ها") }
        items(course.lessons, key = { it.id }) { lesson ->
            LessonRow(
                lesson = lesson,
                completed = lesson.id in completedLessonIds,
                index = course.lessons.indexOf(lesson) + 1,
                onClick = { onLesson(lesson.id) }
            )
        }
    }
}

@Composable
private fun LessonDetailScreen(
    course: Course,
    lesson: Lesson,
    isCompleted: Boolean,
    onBack: () -> Unit,
    onToggleComplete: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        TextButton(onClick = onBack, contentPadding = PaddingValues(0.dp)) { Text("→ بازگشت به دوره") }
        Text(course.title, color = Color(course.accent.toULong()), fontWeight = FontWeight.Bold, fontSize = 13.sp)
        Text(lesson.title, fontSize = 30.sp, fontWeight = FontWeight.Black, lineHeight = 38.sp)
        Text("${lesson.durationMinutes} دقیقه", color = AppMuted)
        Surface(shape = RoundedCornerShape(18.dp), color = AppSurfaceRaised) {
            Column(Modifier.padding(18.dp)) {
                Text("هدف این درس", color = AppPrimary, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(7.dp))
                Text(lesson.objective, lineHeight = 24.sp)
            }
        }
        lesson.sections.forEachIndexed { index, section ->
            Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.Top) {
                Box(
                    Modifier.size(30.dp).clip(CircleShape).background(Color(course.accent.toULong()).copy(alpha = .18f)),
                    contentAlignment = Alignment.Center
                ) {
                    Text("${index + 1}", color = Color(course.accent.toULong()), fontWeight = FontWeight.Bold)
                }
                Spacer(Modifier.width(12.dp))
                Text(section, modifier = Modifier.weight(1f), lineHeight = 26.sp)
            }
        }
        Surface(
            shape = RoundedCornerShape(20.dp),
            color = AppSecondary.copy(alpha = .12f),
            border = BorderStroke(1.dp, AppSecondary.copy(alpha = .35f))
        ) {
            Column(Modifier.padding(18.dp)) {
                Text("تمرین عملی", color = AppSecondary, fontWeight = FontWeight.Black)
                Spacer(Modifier.height(8.dp))
                Text(lesson.drill, lineHeight = 25.sp)
            }
        }
        Button(
            onClick = onToggleComplete,
            modifier = Modifier.fillMaxWidth().height(54.dp),
            shape = RoundedCornerShape(16.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = if (isCompleted) AppSurfaceRaised else AppPrimary,
                contentColor = if (isCompleted) AppPrimary else Color(0xFF00201A)
            )
        ) {
            Text(
                if (isCompleted) "✓ تکمیل شد — لغو علامت" else "علامت‌گذاری به‌عنوان تکمیل",
                fontWeight = FontWeight.Black
            )
        }
        Spacer(Modifier.height(12.dp))
    }
}
