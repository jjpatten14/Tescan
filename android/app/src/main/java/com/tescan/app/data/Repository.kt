package com.tescan.app.data

import android.content.Context
import com.tescan.app.data.model.ConnectionStatus
import com.tescan.app.data.model.HistoryPoint
import com.tescan.app.data.model.HealthStatus
import com.tescan.app.data.model.VehicleSnapshot
import com.tescan.app.data.remote.LiveSocket
import com.tescan.app.data.remote.RestApi
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

/**
 * Single source of truth for vehicle state. Owns the live WebSocket and the
 * REST client, and exposes observable state to the UI.
 */
object Repository {

    private val json = kotlinx.serialization.json.Json {
        ignoreUnknownKeys = true
        isLenient = true
    }

    private val scope = CoroutineScope(SupervisorJob())
    private lateinit var settings: SettingsStore
    private lateinit var rest: RestApi
    private var live: LiveSocket? = null
    private var started = false

    private val _snapshot = MutableStateFlow<VehicleSnapshot?>(null)
    val snapshot: StateFlow<VehicleSnapshot?> = _snapshot

    private val _status = MutableStateFlow(ConnectionStatus.DISCONNECTED)
    val status: StateFlow<ConnectionStatus> = _status

    private val _backend = MutableStateFlow(SettingsStore.DEFAULT_BACKEND)
    val backend: StateFlow<String> = _backend

    fun start(context: Context) {
        if (started) return
        started = true
        settings = SettingsStore(context.applicationContext)
        rest = RestApi(json)

        scope.launch {
            val host = settings.backendUrl.first()
            _backend.value = host
            connect(host)
        }
    }

    private fun connect(host: String) {
        live?.disconnect()
        live = LiveSocket(
            json = json,
            onSnapshot = { _snapshot.value = it },
            onStatus = { _status.value = it },
        ).also { it.connect(host) }
    }

    /** Persist a new backend address and reconnect. */
    fun updateBackend(host: String) {
        scope.launch {
            settings.setBackendUrl(host)
            _backend.value = host.trim()
            connect(host.trim())
        }
    }

    suspend fun health(): HealthStatus = rest.getHealth(_backend.value)

    suspend fun history(start: Double, end: Double, resolution: Int): List<HistoryPoint> =
        rest.getHistory(_backend.value, start, end, resolution)

    suspend fun writeFrame(id: Int, data: String) = rest.writeFrame(_backend.value, id, data)
}
