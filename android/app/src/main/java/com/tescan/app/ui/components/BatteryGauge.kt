package com.tescan.app.ui.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tescan.app.ui.theme.SurfaceVariant
import com.tescan.app.ui.theme.TeslaAmber
import com.tescan.app.ui.theme.TeslaGreen
import com.tescan.app.ui.theme.TeslaRed

/** Semicircular battery gauge (270° arc) with the SOC drawn in the middle. */
@Composable
fun BatteryGauge(
    soc: Double?,
    modifier: Modifier = Modifier,
    diameter: Int = 220,
) {
    val target = (soc ?: 0.0).coerceIn(0.0, 100.0).toFloat()
    val animated by animateFloatAsState(targetValue = target, label = "soc")

    val color = when {
        target > 50f -> TeslaGreen
        target > 20f -> TeslaAmber
        else -> TeslaRed
    }

    val startAngle = 135f
    val sweepTotal = 270f
    val stroke = remember { (diameter * 0.08f) }

    Box(modifier = modifier.size(diameter.dp), contentAlignment = Alignment.Center) {
        Canvas(modifier = Modifier.size(diameter.dp)) {
            val inset = stroke
            val arcSize = Size(size.width - inset * 2, size.height - inset * 2)
            val topLeft = Offset(inset, inset)

            drawArc(
                color = SurfaceVariant,
                startAngle = startAngle,
                sweepAngle = sweepTotal,
                useCenter = false,
                topLeft = topLeft,
                size = arcSize,
                style = Stroke(width = stroke, cap = StrokeCap.Round),
            )
            drawArc(
                color = color,
                startAngle = startAngle,
                sweepAngle = sweepTotal * (animated / 100f),
                useCenter = false,
                topLeft = topLeft,
                size = arcSize,
                style = Stroke(width = stroke, cap = StrokeCap.Round),
            )
        }
        Text(
            text = if (soc != null) "${animated.toInt()}%" else "--",
            color = Color.White,
            fontWeight = FontWeight.Bold,
            fontSize = (diameter * 0.18f).sp,
            style = MaterialTheme.typography.titleLarge,
        )
    }
}
