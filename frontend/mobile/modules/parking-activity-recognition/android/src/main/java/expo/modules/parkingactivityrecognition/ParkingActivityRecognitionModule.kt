package expo.modules.parkingactivityrecognition

import android.Manifest
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.content.ContextCompat
import com.google.android.gms.location.ActivityRecognition
import com.google.android.gms.location.ActivityRecognitionResult
import com.google.android.gms.location.DetectedActivity
import expo.modules.interfaces.permissions.PermissionsResponse
import expo.modules.interfaces.permissions.PermissionsResponseListener
import expo.modules.interfaces.permissions.PermissionsStatus
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

private const val ACTION_ACTIVITY_UPDATE = "com.parknquik.mobile.ACTIVITY_UPDATE"
private const val ACTIVITY_UPDATE_INTERVAL_MS = 10_000L

internal object ParkingActivityRecognitionEventBridge {
  @Volatile
  var emit: ((String, Int) -> Unit)? = null
}

class ParkingActivityRecognitionReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (!ActivityRecognitionResult.hasResult(intent)) return
    val activity = ActivityRecognitionResult.extractResult(intent)?.mostProbableActivity ?: return
    val activityType = when (activity.type) {
      DetectedActivity.IN_VEHICLE -> "IN_VEHICLE"
      DetectedActivity.STILL -> "STILL"
      DetectedActivity.ON_FOOT -> "ON_FOOT"
      DetectedActivity.WALKING -> "WALKING"
      DetectedActivity.RUNNING -> "RUNNING"
      DetectedActivity.ON_BICYCLE -> "ON_BICYCLE"
      else -> null
    } ?: return

    ParkingActivityRecognitionEventBridge.emit?.invoke(activityType, activity.confidence.coerceIn(0, 100))
  }
}

class ParkingActivityRecognitionModule : Module() {
  private var pendingIntent: PendingIntent? = null
  private var updatesStarted = false
  private var appIsForeground = true
  private var requestGeneration = 0

  private val context: Context
    get() = appContext.reactContext ?: throw IllegalStateException("React context is unavailable")

  override fun definition() = ModuleDefinition {
    Name("ParkingActivityRecognition")
    Events("onActivity")

    OnCreate {
      ParkingActivityRecognitionEventBridge.emit = { activityType, confidence ->
        if (updatesStarted && appIsForeground) {
          sendEvent("onActivity", mapOf("activityType" to activityType, "confidence" to confidence))
        }
      }
    }

    OnActivityEntersForeground {
      appIsForeground = true
    }

    OnActivityEntersBackground {
      appIsForeground = false
      stopUpdates()
    }

    OnDestroy {
      stopUpdates()
      ParkingActivityRecognitionEventBridge.emit = null
    }

    AsyncFunction("requestPermission") { promise: Promise ->
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
        promise.resolve(true)
        return@AsyncFunction
      }

      val permissions = appContext.permissions
      if (permissions == null) {
        promise.reject("E_NO_PERMISSIONS", "Expo permissions service is unavailable", null)
        return@AsyncFunction
      }
      permissions.askForPermissions(object : PermissionsResponseListener {
        override fun onResult(result: Map<String, PermissionsResponse>) {
          promise.resolve(result[Manifest.permission.ACTIVITY_RECOGNITION]?.status == PermissionsStatus.GRANTED)
        }
      }, Manifest.permission.ACTIVITY_RECOGNITION)
    }

    AsyncFunction("startActivityUpdates") { promise: Promise ->
      if (!appIsForeground) {
        promise.reject("E_APP_BACKGROUND", "Activity updates can only run while the app is foregrounded", null)
        return@AsyncFunction
      }
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q &&
        ContextCompat.checkSelfPermission(context, Manifest.permission.ACTIVITY_RECOGNITION) != PackageManager.PERMISSION_GRANTED
      ) {
        promise.reject("E_ACTIVITY_PERMISSION", "Activity recognition permission has not been granted", null)
        return@AsyncFunction
      }

      val callbackIntent = pendingIntent ?: PendingIntent.getBroadcast(
        context,
        27031,
        Intent(context, ParkingActivityRecognitionReceiver::class.java).setAction(ACTION_ACTIVITY_UPDATE),
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      ).also { pendingIntent = it }

      val generation = requestGeneration
      ActivityRecognition.getClient(context)
        .requestActivityUpdates(ACTIVITY_UPDATE_INTERVAL_MS, callbackIntent)
        .addOnSuccessListener {
          if (generation != requestGeneration || !appIsForeground) {
            ActivityRecognition.getClient(context).removeActivityUpdates(callbackIntent)
            promise.resolve(null)
            return@addOnSuccessListener
          }
          updatesStarted = true
          promise.resolve(null)
        }
        .addOnFailureListener { error ->
          updatesStarted = false
          promise.reject("E_ACTIVITY_START", "Unable to start activity recognition", error)
        }
    }

    AsyncFunction("stopActivityUpdates") {
      stopUpdates()
    }
  }

  private fun stopUpdates() {
    requestGeneration += 1
    updatesStarted = false
    val callbackIntent = pendingIntent
    pendingIntent = null
    if (callbackIntent != null) {
      runCatching { ActivityRecognition.getClient(context).removeActivityUpdates(callbackIntent) }
    }
  }
}
