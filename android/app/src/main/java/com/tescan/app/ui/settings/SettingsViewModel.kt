package com.tescan.app.ui.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tescan.app.data.Repository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class SettingsViewModel : ViewModel() {

    private val _testResult = MutableStateFlow<String?>(null)
    val testResult: StateFlow<String?> = _testResult

    val backend: StateFlow<String> = Repository.backend
    val status = Repository.status

    fun save(host: String) = Repository.updateBackend(host)

    fun testConnection() {
        _testResult.value = "Testing…"
        viewModelScope.launch {
            _testResult.value = try {
                val h = Repository.health()
                "Connected · mode=${h.mode} · frames=${h.frames_received}"
            } catch (e: Exception) {
                "Failed: ${e.message}"
            }
        }
    }
}
