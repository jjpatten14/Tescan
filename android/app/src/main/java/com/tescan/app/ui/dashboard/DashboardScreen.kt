package com.tescan.app.ui.dashboard

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.Canvas
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.tescan.app.data.Repository
import com.tescan.app.data.model.ConnectionStatus
import com.tescan.app.ui.components.BatteryGauge
import com.tescan.app.ui.components.ChargingIndicator
import com.tescan.app.ui.components.MetricCard
import com.tescan.app.ui.components.fmt
import com.tescan.app.ui.theme.OnSurfaceMuted
import com.tescan.app.ui.theme.TeslaAmber
import com.tescan.app.ui.theme.TeslaBlue
import com.tescan.app.ui.theme.TeslaGreen
import com.tescan.app.ui.theme.TeslaOrange
import com.tescan.app.ui.theme.TeslaRed

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun DashboardScreen() {
    val snapshot by Repository.snapshot.collectAsStateWithLifecycle()
    val status by Repository.status.collectAsStateWithLifecycle()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(bottom = 24.dp),
    ) {
        // Header
        Row(
            modifier = Modifier.fillMaxWidth().padding(20.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text("Tescan", color = Color.White, fontSize = 22.sp, fontWeight = FontWeight.Bold)
            ConnectionDot(status)
        }

        // Gauge
        Box(modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp), contentAlignment = Alignment.Center) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                BatteryGauge(soc = snapshot?.soc, diameter = 220)
                snapshot?.estimated_range_km?.let {
                    Text("${it.toInt()} km est. range", color = OnSurfaceMuted, fontSize = 13.sp)
                }
            }
        }

        // Metrics
        FlowRow(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 6.dp),
            horizontalArrangement = Arrangement.Center,
        ) {
            MetricCard("Speed", fmt(snapshot?.speed_mph, 0), "mph")
            MetricCard(
                "Power", fmt(snapshot?.power_kw, 1), "kW",
                valueColor = when {
                    snapshot?.power_kw == null -> Color.White
                    snapshot!!.power_kw!! >= 0 -> TeslaAmber
                    else -> TeslaGreen
                },
            )
            MetricCard("Torque", fmt(snapshot?.torque_nm, 0), "Nm")
            MetricCard("Batt Min", fmt(snapshot?.battery_temp_min, 1), "°C", valueColor = TeslaBlue)
            MetricCard("Batt Max", fmt(snapshot?.battery_temp_max, 1), "°C", valueColor = TeslaOrange)
            MetricCard("Cabin", fmt(snapshot?.cabin_temp, 1), "°C")
            MetricCard("Odometer", fmt(snapshot?.odometer_km, 0), "km")
            MetricCard(
                "HVAC",
                snapshot?.hvac_on?.let { if (it) "ON" else "OFF" } ?: "--",
                valueColor = if (snapshot?.hvac_on == true) TeslaGreen else OnSurfaceMuted,
            )
        }

        ChargingIndicator(
            chargingState = snapshot?.charging_state,
            rateKw = snapshot?.charge_rate_kw,
            modifier = Modifier.padding(horizontal = 6.dp),
        )

        // Doors
        snapshot?.doors?.let { doors ->
            Column(modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp)) {
                Text("DOORS", color = OnSurfaceMuted, fontSize = 11.sp)
                FlowRow {
                    doors.forEach { (name, open) ->
                        Text(
                            text = name.replace('_', ' '),
                            color = if (open) TeslaRed else OnSurfaceMuted,
                            fontSize = 12.sp,
                            modifier = Modifier.padding(end = 12.dp, top = 4.dp),
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun ConnectionDot(status: ConnectionStatus) {
    val (color, label) = when (status) {
        ConnectionStatus.CONNECTED -> TeslaGreen to "Live"
        ConnectionStatus.CONNECTING -> TeslaAmber to "Connecting…"
        ConnectionStatus.DISCONNECTED -> TeslaRed to "Disconnected"
    }
    Row(verticalAlignment = Alignment.CenterVertically) {
        Canvas(modifier = Modifier.size(8.dp)) { drawCircle(color) }
        Text("  $label", color = color, fontSize = 13.sp)
    }
}
