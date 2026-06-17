package com.tescan.app.data

import android.content.Context
import com.tescan.app.data.model.ConnectionStatus
import com.tescan.app.data.model.HistoryPoint
import com.tescan.app.data.model.VehicleSnapshot
import com.tescan.app.data.model.WriteFrameRequest
import com.tescan.app.data.remote.BleManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

object Repository {

    private val json = kotlinx.serialization.json.Json {
        ignoreUnknownKeys = true
        isLenient = true
    }

    private val scope = CoroutineScope(SupervisorJob())
    private lateinit var settings: SettingsStore
    private lateinit var appContext: Context
    private var ble: BleManager? = null
    private var started = false

    private val _snapshot = MutableStateFlow<VehicleSnapshot?>(null)
    val snapshot: StateFlow<VehicleSnapshot?> = _snapshot

    private val _status = MutableStateFlow(ConnectionStatus.DISCONNECTED)
    val status: StateFlow<ConnectionStatus> = _status

    private val _deviceName = MutableStateFlow(SettingsStore.DEFAULT_DEVICE_NAME)
    val deviceName: StateFlow<String> = _deviceName

    fun start(context: Context) {
        if (started) return
        started = true
        appContext = context.applicationContext
        settings = SettingsStore(appContext)

        scope.launch {
            val name = settings.bleDeviceName.first()
            _deviceName.value = name
            connect(name)
        }
    }

    private fun connect(name: String) {
        ble?.disconnect()
        ble = BleManager(
            context = appContext,
            json = json,
            deviceName = name,
            onSnapshot = { _snapshot.value = it },
            onStatus = { _status.value = it },
        ).also { it.connect() }
    }

    fun updateDevice(name: String) {
        scope.launch {
            settings.setBleDeviceName(name)
            _deviceName.value = name.trim()
            connect(name.trim())
        }
    }

    suspend fun history(start: Double, end: Double, resolution: Int): List<HistoryPoint> =
        emptyList()

    fun writeFrame(id: Int, data: String) {
        val payload = json.encodeToString(
            WriteFrameRequest.serializer(),
            WriteFrameRequest(bus = "vehicle", id = id, data = data)
        )
        ble?.send(payload.toByteArray(Charsets.UTF_8))
    }
}
