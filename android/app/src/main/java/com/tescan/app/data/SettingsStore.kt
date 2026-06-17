package com.tescan.app.data

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.dataStore by preferencesDataStore(name = "tescan_settings")

class SettingsStore(private val context: Context) {

    private val bleKey = stringPreferencesKey("ble_device_name")

    val bleDeviceName: Flow<String> = context.dataStore.data.map { prefs ->
        prefs[bleKey] ?: DEFAULT_DEVICE_NAME
    }

    suspend fun setBleDeviceName(value: String) {
        context.dataStore.edit { it[bleKey] = value.trim() }
    }

    companion object {
        const val DEFAULT_DEVICE_NAME = "TESCAN"
    }
}
