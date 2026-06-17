package com.tescan.app.data.remote

import android.bluetooth.BluetoothGatt
import android.bluetooth.BluetoothGattCallback
import android.bluetooth.BluetoothGattCharacteristic
import android.bluetooth.BluetoothGattDescriptor
import android.bluetooth.BluetoothProfile
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanFilter
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.content.Context
import android.os.Build
import android.os.Handler
import android.os.Looper
import com.tescan.app.data.CanDecoder
import com.tescan.app.data.model.ConnectionStatus
import com.tescan.app.data.model.RawCANFrame
import com.tescan.app.data.model.VehicleSnapshot
import kotlinx.serialization.json.Json
import java.util.UUID

class BleManager(
    private val context: Context,
    private val json: Json,
    private val deviceName: String,
    private val onSnapshot: (VehicleSnapshot) -> Unit,
    private val onStatus: (ConnectionStatus) -> Unit,
) {
    companion object {
        val NUS_SERVICE = UUID.fromString("6E400001-B5A3-F393-E0A9-E50E24DCCA9E")
        val NUS_TX_CHAR = UUID.fromString("6E400003-B5A3-F393-E0A9-E50E24DCCA9E")
        val NUS_RX_CHAR = UUID.fromString("6E400002-B5A3-F393-E0A9-E50E24DCCA9E")
        val CCCD_UUID   = UUID.fromString("00002902-0000-1000-8000-00805f9b34fb")
    }

    private val handler = Handler(Looper.getMainLooper())
    private val decoder = CanDecoder()
    private val lineBuffer = StringBuilder()

    private var gatt: BluetoothGatt? = null
    private var rxChar: BluetoothGattCharacteristic? = null
    private var active = false

    private val bluetoothAdapter by lazy {
        val mgr = context.getSystemService(Context.BLUETOOTH_SERVICE) as android.bluetooth.BluetoothManager
        mgr.adapter
    }

    private val scanCallback = object : ScanCallback() {
        override fun onScanResult(callbackType: Int, result: ScanResult) {
            bluetoothAdapter.bluetoothLeScanner?.stopScan(this)
            onStatus(ConnectionStatus.CONNECTING)
            gatt = result.device.connectGatt(context, false, gattCallback)
        }
    }

    private val gattCallback = object : BluetoothGattCallback() {
        override fun onConnectionStateChange(g: BluetoothGatt, status: Int, newState: Int) {
            if (newState == BluetoothProfile.STATE_CONNECTED) {
                g.discoverServices()
            } else {
                onStatus(ConnectionStatus.DISCONNECTED)
                g.close()
                gatt = null
                if (active) handler.postDelayed({ startScan() }, 3000)
            }
        }

        override fun onServicesDiscovered(g: BluetoothGatt, status: Int) {
            val svc = g.getService(NUS_SERVICE) ?: return
            val tx = svc.getCharacteristic(NUS_TX_CHAR) ?: return
            rxChar = svc.getCharacteristic(NUS_RX_CHAR)

            g.setCharacteristicNotification(tx, true)
            val desc = tx.getDescriptor(CCCD_UUID) ?: return
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                g.writeDescriptor(desc, BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE)
            } else {
                @Suppress("DEPRECATION")
                desc.value = BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE
                @Suppress("DEPRECATION")
                g.writeDescriptor(desc)
            }
        }

        override fun onDescriptorWrite(g: BluetoothGatt, desc: BluetoothGattDescriptor, status: Int) {
            onStatus(ConnectionStatus.CONNECTED)
        }

        // Android < 13
        @Suppress("DEPRECATION", "OVERRIDE_DEPRECATION")
        override fun onCharacteristicChanged(g: BluetoothGatt, char: BluetoothGattCharacteristic) {
            handleBytes(char.value)
        }

        // Android 13+
        override fun onCharacteristicChanged(
            g: BluetoothGatt,
            char: BluetoothGattCharacteristic,
            value: ByteArray,
        ) {
            handleBytes(value)
        }
    }

    private fun handleBytes(bytes: ByteArray) {
        lineBuffer.append(String(bytes, Charsets.UTF_8))
        var nl = lineBuffer.indexOf('\n')
        while (nl >= 0) {
            val line = lineBuffer.substring(0, nl).trim()
            lineBuffer.delete(0, nl + 1)
            if (line.isNotEmpty()) parseLine(line)
            nl = lineBuffer.indexOf('\n')
        }
    }

    private fun parseLine(line: String) {
        try {
            val frame = json.decodeFromString(RawCANFrame.serializer(), line)
            onSnapshot(decoder.decode(frame))
        } catch (_: Exception) {}
    }

    private fun startScan() {
        if (!active) return
        onStatus(ConnectionStatus.CONNECTING)
        val filter = ScanFilter.Builder().setDeviceName(deviceName).build()
        val settings = ScanSettings.Builder()
            .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
            .build()
        bluetoothAdapter.bluetoothLeScanner?.startScan(listOf(filter), settings, scanCallback)
    }

    fun connect() {
        active = true
        startScan()
    }

    fun disconnect() {
        active = false
        bluetoothAdapter.bluetoothLeScanner?.stopScan(scanCallback)
        gatt?.disconnect()
        gatt?.close()
        gatt = null
        rxChar = null
        onStatus(ConnectionStatus.DISCONNECTED)
    }

    fun send(jsonBytes: ByteArray) {
        val g = gatt ?: return
        val c = rxChar ?: return
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            g.writeCharacteristic(c, jsonBytes, BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT)
        } else {
            @Suppress("DEPRECATION")
            c.value = jsonBytes
            @Suppress("DEPRECATION")
            g.writeCharacteristic(c)
        }
    }
}
