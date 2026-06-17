package com.tescan.app.data.remote

import com.tescan.app.data.model.HealthStatus
import com.tescan.app.data.model.HistoryPoint
import com.tescan.app.data.model.VehicleSnapshot
import com.tescan.app.data.model.WriteFrameRequest
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.concurrent.TimeUnit

/** Thin OkHttp + kotlinx.serialization REST client. Host is resolved per call. */
class RestApi(private val json: Json) {

    private val client = OkHttpClient.Builder()
        .connectTimeout(5, TimeUnit.SECONDS)
        .readTimeout(10, TimeUnit.SECONDS)
        .build()

    private val jsonMedia = "application/json".toMediaType()

    suspend fun getHealth(host: String): HealthStatus = withContext(Dispatchers.IO) {
        get(host, "/api/v1/health").let { json.decodeFromString(HealthStatus.serializer(), it) }
    }

    suspend fun getStatus(host: String): VehicleSnapshot = withContext(Dispatchers.IO) {
        get(host, "/api/v1/status").let { json.decodeFromString(VehicleSnapshot.serializer(), it) }
    }

    suspend fun getHistory(
        host: String,
        start: Double,
        end: Double,
        resolution: Int,
    ): List<HistoryPoint> = withContext(Dispatchers.IO) {
        val path = "/api/v1/history?start=$start&end=$end&resolution=$resolution"
        get(host, path).let {
            json.decodeFromString(ListSerializer(HistoryPoint.serializer()), it)
        }
    }

    /** Sends a CAN write command (vehicle bus only; backend rejects chassis). */
    suspend fun writeFrame(host: String, id: Int, data: String) = withContext(Dispatchers.IO) {
        val payload = json.encodeToString(WriteFrameRequest.serializer(), WriteFrameRequest("vehicle", id, data))
        val request = Request.Builder()
            .url("http://$host/api/v1/write")
            .post(payload.toRequestBody(jsonMedia))
            .build()
        client.newCall(request).execute().use { resp ->
            if (!resp.isSuccessful) throw RuntimeException("write failed: ${resp.code}")
        }
    }

    private fun get(host: String, path: String): String {
        val request = Request.Builder().url("http://$host$path").get().build()
        client.newCall(request).execute().use { resp ->
            if (!resp.isSuccessful) throw RuntimeException("HTTP ${resp.code}")
            return resp.body?.string() ?: throw RuntimeException("empty body")
        }
    }
}
