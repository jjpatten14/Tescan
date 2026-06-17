package com.tescan.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val TescanColors = darkColorScheme(
    primary = TeslaGreen,
    onPrimary = Color.Black,
    background = Background,
    onBackground = OnBackground,
    surface = Surface,
    onSurface = OnBackground,
    surfaceVariant = SurfaceVariant,
    error = TeslaRed,
)

@Composable
fun TescanTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = TescanColors,
        typography = TescanTypography,
        content = content,
    )
}
