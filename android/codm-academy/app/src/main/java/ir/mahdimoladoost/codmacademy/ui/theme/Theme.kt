package ir.mahdimoladoost.codmacademy.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

val AppBackground = Color(0xFF0B1018)
val AppSurface = Color(0xFF121A25)
val AppSurfaceRaised = Color(0xFF192432)
val AppPrimary = Color(0xFF16E0BD)
val AppSecondary = Color(0xFFFFB636)
val AppText = Color(0xFFF4F7FA)
val AppMuted = Color(0xFF9BA9B8)

private val AcademyColors = darkColorScheme(
    primary = AppPrimary,
    onPrimary = Color(0xFF00201A),
    secondary = AppSecondary,
    onSecondary = Color(0xFF271900),
    background = AppBackground,
    onBackground = AppText,
    surface = AppSurface,
    onSurface = AppText,
    surfaceVariant = AppSurfaceRaised,
    onSurfaceVariant = AppMuted,
    outline = Color(0xFF334252)
)

@Composable
fun CodmAcademyTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = AcademyColors,
        content = content
    )
}
