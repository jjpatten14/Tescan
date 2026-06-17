package com.tescan.app.data

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.dataStore by preferencesDataStore(name = "tescan_settings")

/** Persists the backend address (IP:PORT). */
class SettingsStore(private val context: Context) {

    private val backendKey = stringPreferencesKey("backend_url")

    val backendUrl: Flow<String> = context.dataStore.data.map { prefs ->
        prefs[backendKey] ?: DEFAULT_BACKEND
    }

    suspend fun setBackendUrl(value: String) {
        context.dataStore.edit { it[backendKey] = value.trim() }
    }

    companion object {
        const val DEFAULT_BACKEND = "192.168.4.2:8000"
    }
}
