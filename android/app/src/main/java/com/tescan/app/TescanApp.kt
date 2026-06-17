package com.tescan.app

import android.app.Application
import com.tescan.app.data.Repository

class TescanApp : Application() {
    override fun onCreate() {
        super.onCreate()
        Repository.start(this)
    }
}
