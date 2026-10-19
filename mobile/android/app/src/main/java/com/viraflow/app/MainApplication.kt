package com.viraflow.app

import android.app.Application
import android.content.res.Configuration
import java.io.File
import java.io.PrintWriter
import java.io.StringWriter
import java.util.Date

import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.ReactPackage
import com.facebook.react.ReactHost
import com.facebook.react.common.ReleaseLevel
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint

import expo.modules.ApplicationLifecycleDispatcher
import expo.modules.ExpoReactHostFactory

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    ExpoReactHostFactory.getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here, for example:
          // add(MyReactNativePackage())
        }
    )
  }

  override fun onCreate() {
    super.onCreate()
    installCrashRecorder()
    DefaultNewArchitectureEntryPoint.releaseLevel = try {
      ReleaseLevel.valueOf(BuildConfig.REACT_NATIVE_RELEASE_LEVEL.uppercase())
    } catch (e: IllegalArgumentException) {
      ReleaseLevel.STABLE
    }
    loadReactNative(this)
    ApplicationLifecycleDispatcher.onApplicationCreate(this)
  }

  /**
   * Saves the details of any crash so the next launch can show them (see MainActivity). Without this a
   * crash only shows as the app closing, with nothing the user can report.
   */
  private fun installCrashRecorder() {
    val previous = Thread.getDefaultUncaughtExceptionHandler()
    Thread.setDefaultUncaughtExceptionHandler { thread, error ->
      try {
        val trace = StringWriter().also { error.printStackTrace(PrintWriter(it)) }.toString()
        val version = try {
          packageManager.getPackageInfo(packageName, 0).versionName
        } catch (_: Throwable) {
          "?"
        }
        File(filesDir, CRASH_FILE_NAME).writeText(
          "Sohba $version on Android ${android.os.Build.VERSION.RELEASE} (${android.os.Build.MANUFACTURER} ${android.os.Build.MODEL})\n" +
            "Thread: ${thread.name}\nTime: ${Date()}\n\n" + trace.take(12000)
        )
      } catch (_: Throwable) {
        // Never let the recorder itself get in the way of the crash being handled.
      }
      previous?.uncaughtException(thread, error)
    }
  }

  companion object {
    const val CRASH_FILE_NAME = "last-crash.txt"
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)
  }
}
