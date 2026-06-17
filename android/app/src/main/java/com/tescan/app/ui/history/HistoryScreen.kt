package com.tescan.app.ui.history

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.tescan.app.ui.components.LineChart
import com.tescan.app.ui.theme.OnSurfaceMuted
import com.tescan.app.ui.theme.TeslaAmber
import com.tescan.app.ui.theme.TeslaGreen

@Composable
fun HistoryScreen(vm: HistoryViewModel = viewModel()) {
    val state by vm.state.collectAsStateWithLifecycle()

    Column(
        modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(bottom = 24.dp),
    ) {
        Text(
            "History",
            color = androidx.compose.ui.graphics.Color.White,
            fontSize = 22.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(20.dp),
        )

        Row(modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp)) {
            vm.ranges.forEachIndexed { i, (label, _) ->
                FilterChip(
                    selected = i == state.rangeIndex,
                    onClick = { vm.load(i) },
                    label = { Text(label) },
                    modifier = Modifier.padding(end = 8.dp),
                )
            }
        }

        when {
            state.loading -> Row(
                modifier = Modifier.fillMaxWidth().padding(40.dp),
                horizontalArrangement = Arrangement.Center,
            ) { CircularProgressIndicator(color = TeslaGreen) }

            state.error != null -> Text(
                state.error!!,
                color = androidx.compose.ui.graphics.Color.Red,
                modifier = Modifier.padding(20.dp),
            )

            state.points.size < 2 -> Text(
                "No data for this period yet.",
                color = OnSurfaceMuted,
                modifier = Modifier.padding(20.dp),
            )

            else -> {
                val socValues = state.points.mapNotNull { it.soc?.toFloat() }
                val powerValues = state.points.mapNotNull { it.power_kw?.toFloat() }

                if (socValues.size >= 2) {
                    ChartSection("State of Charge (%)", socValues, TeslaGreen)
                }
                if (powerValues.size >= 2) {
                    ChartSection("Power (kW)", powerValues, TeslaAmber)
                }
            }
        }
    }
}

@Composable
private fun ChartSection(title: String, values: List<Float>, color: androidx.compose.ui.graphics.Color) {
    Column(modifier = Modifier.padding(horizontal = 8.dp, vertical = 8.dp)) {
        Text(title, color = OnSurfaceMuted, fontSize = 12.sp, modifier = Modifier.padding(start = 12.dp))
        LineChart(values = values, lineColor = color)
    }
}
