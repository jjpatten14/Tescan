package com.tescan.app.ui.settings

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.tescan.app.data.model.ConnectionStatus
import com.tescan.app.ui.theme.OnSurfaceMuted
import com.tescan.app.ui.theme.Surface
import com.tescan.app.ui.theme.TeslaAmber
import com.tescan.app.ui.theme.TeslaGreen
import com.tescan.app.ui.theme.TeslaRed

@Composable
fun SettingsScreen(vm: SettingsViewModel = viewModel()) {
    val deviceName by vm.deviceName.collectAsStateWithLifecycle()
    val status by vm.status.collectAsStateWithLifecycle()
    val testResult by vm.testResult.collectAsStateWithLifecycle()

    var input by remember { mutableStateOf(deviceName) }
    LaunchedEffect(deviceName) { input = deviceName }

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Text("Settings", color = Color.White, fontSize = 22.sp, fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(bottom = 16.dp, top = 4.dp))

        // BLE connection status
        Card(
            modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp),
            shape = RoundedCornerShape(12.dp),
            colors = CardDefaults.cardColors(containerColor = Surface),
        ) {
            Column(Modifier.padding(16.dp)) {
                Text("BLE Connection", color = Color.White, fontWeight = FontWeight.SemiBold)
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 8.dp)) {
                    val (c, label) = when (status) {
                        ConnectionStatus.CONNECTED -> TeslaGreen to "Connected"
                        ConnectionStatus.CONNECTING -> TeslaAmber to "Scanning…"
                        ConnectionStatus.DISCONNECTED -> TeslaRed to "Disconnected"
                    }
                    Canvas(modifier = Modifier.size(10.dp)) { drawCircle(c) }
                    Text("  $label", color = c)
                }
            }
        }

        // BLE device name
        Card(
            modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp),
            shape = RoundedCornerShape(12.dp),
            colors = CardDefaults.cardColors(containerColor = Surface),
        ) {
            Column(Modifier.padding(16.dp)) {
                Text("BLE Device Name", color = Color.White, fontWeight = FontWeight.SemiBold)
                Text("Name advertised by the ESP32 (default: TESCAN)",
                    color = OnSurfaceMuted, fontSize = 12.sp, modifier = Modifier.padding(vertical = 6.dp))
                OutlinedTextField(
                    value = input,
                    onValueChange = { input = it },
                    singleLine = true,
                    placeholder = { Text("TESCAN") },
                    modifier = Modifier.fillMaxWidth(),
                )
                Row(modifier = Modifier.padding(top = 12.dp)) {
                    Button(
                        onClick = { vm.save(input) },
                        colors = ButtonDefaults.buttonColors(containerColor = TeslaGreen),
                        modifier = Modifier.padding(end = 10.dp),
                    ) { Text("Save & Reconnect", color = Color.Black) }
                    Button(onClick = { vm.testConnection() }) { Text("Check Status") }
                }
                testResult?.let {
                    Text(it, color = OnSurfaceMuted, fontSize = 13.sp, modifier = Modifier.padding(top = 10.dp))
                }
            }
        }

        // Chassis bus safety notice (deferred but kept for awareness)
        Card(
            modifier = Modifier.fillMaxWidth().border(1.dp, TeslaAmber, RoundedCornerShape(12.dp)),
            shape = RoundedCornerShape(12.dp),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF2A1A00)),
        ) {
            Column(Modifier.padding(16.dp)) {
                Text("Chassis Bus", color = TeslaAmber, fontWeight = FontWeight.Bold)
                Text(
                    "Chassis bus access is deferred — a satellite ESP32 under the seat will " +
                        "handle it in a future release. The chassis bus carries ABS, steering, " +
                        "airbag and stability-control traffic and is strictly read-only.",
                    color = Color(0xFFCC8800), fontSize = 13.sp, modifier = Modifier.padding(top = 8.dp),
                )
            }
        }
    }
}
