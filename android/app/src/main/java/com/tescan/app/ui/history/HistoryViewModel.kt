package com.tescan.app.ui.history

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tescan.app.data.Repository
import com.tescan.app.data.model.HistoryPoint
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

data class HistoryUiState(
    val loading: Boolean = false,
    val points: List<HistoryPoint> = emptyList(),
    val error: String? = null,
    val rangeIndex: Int = 0,
)

class HistoryViewModel : ViewModel() {

    val ranges = listOf("1h" to 3600, "6h" to 21600, "24h" to 86400, "7d" to 604800)

    private val _state = MutableStateFlow(HistoryUiState())
    val state: StateFlow<HistoryUiState> = _state

    init { load(0) }

    fun load(rangeIndex: Int) {
        _state.value = _state.value.copy(loading = true, error = null, rangeIndex = rangeIndex)
        viewModelScope.launch {
            try {
                val seconds = ranges[rangeIndex].second
                val now = System.currentTimeMillis() / 1000.0
                val resolution = (seconds / 200).coerceAtLeast(10)
                val data = Repository.history(now - seconds, now, resolution)
                _state.value = _state.value.copy(loading = false, points = data)
            } catch (e: Exception) {
                _state.value = _state.value.copy(loading = false, error = e.message ?: "Failed to load")
            }
        }
    }
}
