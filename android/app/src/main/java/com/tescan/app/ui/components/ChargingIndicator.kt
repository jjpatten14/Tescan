package com.tescan.app.ui.components

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tescan.app.ui.theme.OnSurfaceMuted
import com.tescan.app.ui.theme.Surface
import com.tescan.app.ui.theme.SurfaceVariant
import com.tescan.app.ui.theme.TeslaCyan
import com.tescan.app.ui.theme.TeslaGreen

@Composable
fun ChargingIndicator(
    chargingState: String?,
    rateKw: Double?,
    modifier: Modifier = Modifier,
) {
    val charging = chargingState == "ac" || chargingState == "dc"
    val color = if (chargingState == "dc") TeslaCyan else TeslaGreen

    val transition = rememberInfiniteTransition(label = "bolt")
    val alpha by transition.animateFloat(
        initialValue = 0.25f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(tween(700), RepeatMode.Reverse),
        label = "alpha",
    )
    val boltAlpha = if (charging) alpha else 0.25f

    Card(
        modifier = modifier.padding(6.dp),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Surface),
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Canvas(modifier = Modifier.size(width = 28.dp, height = 44.dp)) {
                val w = size.width
                val h = size.height
                val path = Path().apply {
                    moveTo(w * 0.57f, 0f)
                    lineTo(w * 0.21f, h * 0.55f)
                    lineTo(w * 0.5f, h * 0.55f)
                    lineTo(w * 0.43f, h)
                    lineTo(w * 0.79f, h * 0.45f)
                    lineTo(w * 0.5f, h * 0.45f)
                    close()
                }
                drawPath(path, color = if (charging) color else SurfaceVariant, alpha = boltAlpha)
            }
            Column(modifier = Modifier.padding(start = 10.dp)) {
                Text(
                    text = when (chargingState) {
                        "dc" -> "DC Fast Charging"
                        "ac" -> "AC Charging"
                        else -> "Not Charging"
                    },
                    color = if (charging) color else OnSurfaceMuted,
                    fontSize = 14.sp,
                )
                if (charging && rateKw != null) {
                    Text(text = "%.1f kW".format(rateKw), color = OnSurfaceMuted, fontSize = 13.sp)
                }
            }
        }
    }
}
