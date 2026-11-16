import CoreMotion
import ExpoModulesCore

public class ParkingActivityRecognitionModule: Module {
  private let motionManager = CMMotionActivityManager()
  private var updatesStarted = false
  private var appIsForeground = true
  private var permissionRequestActive = false
  private var generation = 0

  public func definition() -> ModuleDefinition {
    Name("ParkingActivityRecognition")
    Events("onActivity")

    OnActivityEntersForeground {
      self.appIsForeground = true
    }

    OnActivityEntersBackground {
      self.appIsForeground = false
      self.stopUpdates()
    }

    OnDestroy {
      self.stopUpdates()
    }

    AsyncFunction("requestPermission") { (promise: Promise) in
      guard CMMotionActivityManager.isActivityAvailable() else {
        promise.resolve(false)
        return
      }

      switch CMMotionActivityManager.authorizationStatus() {
      case .authorized:
        promise.resolve(true)
      case .denied, .restricted:
        promise.resolve(false)
      case .notDetermined:
        self.requestMotionAuthorization(promise: promise, deadline: Date().addingTimeInterval(60))
      @unknown default:
        promise.resolve(false)
      }
    }

    AsyncFunction("startActivityUpdates") { (promise: Promise) in
      guard self.appIsForeground else {
        promise.reject("E_APP_BACKGROUND", "Activity updates can only run while the app is foregrounded", nil)
        return
      }
      guard CMMotionActivityManager.isActivityAvailable() else {
        promise.reject("E_ACTIVITY_UNAVAILABLE", "Core Motion activity recognition is unavailable on this device", nil)
        return
      }
      guard CMMotionActivityManager.authorizationStatus() == .authorized else {
        promise.reject("E_ACTIVITY_PERMISSION", "Motion permission has not been granted", nil)
        return
      }

      self.stopUpdates()
      self.generation += 1
      let generation = self.generation
      self.updatesStarted = true
      self.motionManager.startActivityUpdates(to: .main) { [weak self] activity in
        guard let self, self.generation == generation, self.updatesStarted, self.appIsForeground, let activity else { return }
        guard let signal = Self.normalize(activity) else { return }
        self.sendEvent("onActivity", [
          "activityType": signal.activityType,
          "confidence": signal.confidence,
        ])
      }
      promise.resolve(nil)
    }

    AsyncFunction("stopActivityUpdates") {
      self.stopUpdates()
    }
  }

  private func requestMotionAuthorization(promise: Promise, deadline: Date) {
    // Starting Core Motion is what triggers iOS's motion permission prompt.
    permissionRequestActive = true
    motionManager.startActivityUpdates(to: .main) { _ in }
    pollAuthorization(promise: promise, deadline: deadline)
  }

  private func pollAuthorization(promise: Promise, deadline: Date) {
    guard appIsForeground else {
      motionManager.stopActivityUpdates()
      permissionRequestActive = false
      promise.resolve(false)
      return
    }

    switch CMMotionActivityManager.authorizationStatus() {
    case .authorized:
      motionManager.stopActivityUpdates()
      permissionRequestActive = false
      promise.resolve(true)
    case .denied, .restricted:
      motionManager.stopActivityUpdates()
      permissionRequestActive = false
      promise.resolve(false)
    case .notDetermined:
      guard Date() < deadline else {
        motionManager.stopActivityUpdates()
        permissionRequestActive = false
        promise.resolve(false)
        return
      }
      DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) { [weak self] in
        guard let self else {
          promise.resolve(false)
          return
        }
        self.pollAuthorization(promise: promise, deadline: deadline)
      }
    @unknown default:
      motionManager.stopActivityUpdates()
      promise.resolve(false)
    }
  }

  private func stopUpdates() {
    generation += 1
    if updatesStarted || permissionRequestActive {
      updatesStarted = false
      permissionRequestActive = false
      motionManager.stopActivityUpdates()
    }
  }

  private static func normalize(_ activity: CMMotionActivity) -> (activityType: String, confidence: Int)? {
    let activityType: String
    if activity.automotive {
      activityType = "IN_VEHICLE"
    } else if activity.running {
      activityType = "RUNNING"
    } else if activity.walking {
      activityType = "WALKING"
    } else if activity.cycling {
      activityType = "ON_BICYCLE"
    } else if activity.stationary {
      activityType = "STILL"
    } else {
      return nil
    }

    let confidence: Int
    switch activity.confidence {
    case .low:
      confidence = 30
    case .medium:
      confidence = 65
    case .high:
      confidence = 90
    @unknown default:
      confidence = 50
    }
    return (activityType, confidence)
  }
}
