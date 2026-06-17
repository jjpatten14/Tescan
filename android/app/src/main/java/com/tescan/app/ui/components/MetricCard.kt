package com.tescan.app.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tescan.app.ui.theme.OnSurfaceMuted
import com.tescan.app.ui.theme.Surface

/** Reusable metric tile: label, value, unit. */
@Composable
fun MetricCard(
    label: String,
    value: String,
    unit: String = "",
    valueColor: Color = Color.White,
    modifier: Modifier = Modifier,
) {
    Card(
        modifier = modifier.padding(6.dp).widthIn(min = 96.dp),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Surface),
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Text(
                text = label.uppercase(),
                color = OnSurfaceMuted,
                fontSize = 11.sp,
                letterSpacing = 0.5.sp,
            )
            Text(
                text = value,
                color = valueColor,
                fontSize = 22.sp,
                fontWeight = FontWeight.SemiBold,
            )
            if (unit.isNotEmpty()) {
                Text(text = unit, color = OnSurfaceMuted, fontSize = 11.sp)
            }
        }
    }
}

/** Formats a nullable Double for display, or "--" when absent. */
fun fmt(value: Double?, decimals: Int = 1): String =
    if (value == null) "--" else "%.${decimals}f".format(value)
