package com.tescan.app.ui.settings

import androidx.lifecycle.ViewModel
import com.tescan.app.data.Repository
import com.tescan.app.data.model.ConnectionStatus
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

class SettingsViewModel : ViewModel() {

    private val _testResult = MutableStateFlow<String?>(null)
    val testResult: StateFlow<String?> = _testResult

    val deviceName: StateFlow<String> = Repository.deviceName
    val status = Repository.status

    fun save(name: String) = Repository.updateDevice(name)

    fun testConnection() {
        _testResult.value = when (Repository.status.value) {
            ConnectionStatus.CONNECTED -> "BLE connected to ${Repository.deviceName.value}"
            ConnectionStatus.CONNECTING -> "Connecting to ${Repository.deviceName.value}…"
            ConnectionStatus.DISCONNECTED -> "Not connected — scanning for ${Repository.deviceName.value}"
        }
    }
}
