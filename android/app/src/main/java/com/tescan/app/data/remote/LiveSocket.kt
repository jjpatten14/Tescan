package com.tescan.app.data.remote

import com.tescan.app.data.model.ConnectionStatus
import com.tescan.app.data.model.VehicleSnapshot
import kotlinx.serialization.json.Json
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import java.util.concurrent.TimeUnit

/**
 * Maintains a WebSocket to the backend's /ws/live endpoint with automatic
 * reconnection. Pushes decoded snapshots and connection-status changes back
 * through the supplied callbacks.
 */
class LiveSocket(
    private val json: Json,
    private val onSnapshot: (VehicleSnapshot) -> Unit,
    private val onStatus: (ConnectionStatus) -> Unit,
) {
    private val client = OkHttpClient.Builder()
        .pingInterval(20, TimeUnit.SECONDS)
        .build()

    private var socket: WebSocket? = null
    private var currentHost: String = ""
    private var active = false

    fun connect(host: String) {
        active = true
        currentHost = host
        open()
    }

    private fun open() {
        if (!active) return
        onStatus(ConnectionStatus.CONNECTING)
        val request = Request.Builder()
            .url("ws://$currentHost/ws/live")
            .build()
        socket = client.newWebSocket(request, listener)
    }

    private val listener = object : WebSocketListener() {
        override fun onOpen(webSocket: WebSocket, response: Response) {
            onStatus(ConnectionStatus.CONNECTED)
        }

        override fun onMessage(webSocket: WebSocket, text: String) {
            try {
                onSnapshot(json.decodeFromString(VehicleSnapshot.serializer(), text))
            } catch (_: Exception) {
                // ignore malformed frames
            }
        }

        override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
            onStatus(ConnectionStatus.DISCONNECTED)
            scheduleReconnect()
        }

        override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
            onStatus(ConnectionStatus.DISCONNECTED)
            scheduleReconnect()
        }
    }

    private fun scheduleReconnect() {
        if (!active) return
        Thread {
            Thread.sleep(3000)
            open()
        }.apply { isDaemon = true }.start()
    }

    fun disconnect() {
        active = false
        socket?.close(1000, "client closing")
        socket = null
    }
}
