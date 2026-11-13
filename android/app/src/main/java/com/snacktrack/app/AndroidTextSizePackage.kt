package com.snacktrack.app

import android.content.ComponentCallbacks
import android.content.res.Configuration
import android.util.TypedValue
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.uimanager.ViewManager

class AndroidTextSizePackage : ReactPackage {
  override fun createViewManagers(context: ReactApplicationContext): List<ViewManager<*, *>> = emptyList()
  override fun createNativeModules(context: ReactApplicationContext): List<NativeModule> = listOf(AndroidTextSize(context))
}

private class AndroidTextSize(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context), ComponentCallbacks {
  override fun getName() = "AndroidTextSize"

  override fun initialize() {
    super.initialize()
    context.applicationContext.registerComponentCallbacks(this)
  }

  override fun invalidate() {
    context.applicationContext.unregisterComponentCallbacks(this)
    super.invalidate()
  }

  override fun onLowMemory() = Unit
  override fun onConfigurationChanged(newConfig: Configuration) {
    context.emitDeviceEvent("androidTextScaleChanged", newConfig.fontScale.toDouble())
  }

  @ReactMethod(isBlockingSynchronousMethod = true)
  fun getFontScale() = context.resources.configuration.fontScale.toDouble()

  @ReactMethod(isBlockingSynchronousMethod = true)
  fun toDp(sp: Double): Double {
    val metrics = context.resources.displayMetrics
    return (TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_SP, sp.toFloat(), metrics) / metrics.density).toDouble()
  }
}
