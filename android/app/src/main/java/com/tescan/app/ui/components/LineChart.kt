package com.tescan.app.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.dp

/**
 * Minimal line chart drawn with Compose Canvas — no third-party chart library.
 * Points are (x, y); x is used only for ordering, the axis is index-based.
 */
@Composable
fun LineChart(
    values: List<Float>,
    lineColor: Color,
    modifier: Modifier = Modifier,
    heightDp: Int = 180,
) {
    Canvas(
        modifier = modifier
            .fillMaxWidth()
            .height(heightDp.dp)
            .padding(horizontal = 8.dp, vertical = 8.dp),
    ) {
        if (values.size < 2) return@Canvas

        val minV = values.min()
        val maxV = values.max()
        val range = (maxV - minV).takeIf { it > 0.0001f } ?: 1f

        val stepX = size.width / (values.size - 1)

        fun pointFor(i: Int): Offset {
            val x = stepX * i
            val norm = (values[i] - minV) / range
            val y = size.height - norm * size.height
            return Offset(x, y)
        }

        // baseline grid
        drawLine(
            color = Color(0xFF2A2A2A),
            start = Offset(0f, size.height),
            end = Offset(size.width, size.height),
            strokeWidth = 2f,
        )

        val path = Path().apply {
            val first = pointFor(0)
            moveTo(first.x, first.y)
            for (i in 1 until values.size) {
                val p = pointFor(i)
                lineTo(p.x, p.y)
            }
        }
        drawPath(path, color = lineColor, style = Stroke(width = 4f))
    }
}
