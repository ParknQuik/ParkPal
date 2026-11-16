import { requireOptionalNativeModule, type EventEmitter, type EventSubscription } from 'expo-modules-core';

export type ActivityType =
  | 'IN_VEHICLE'
  | 'STILL'
  | 'ON_FOOT'
  | 'WALKING'
  | 'RUNNING'
  | 'ON_BICYCLE';

export interface ActivityRecognitionEvent {
  activityType: ActivityType;
  confidence: number;
}

type NativeActivityRecognitionModule = EventEmitter<NativeEvents> & {
  requestPermission(): Promise<boolean>;
  startActivityUpdates(): Promise<void>;
  stopActivityUpdates(): Promise<void>;
  addListener(eventName: 'onActivity', listener: NativeEvents['onActivity']): EventSubscription;
};

type NativeEvents = {
  onActivity: (event: ActivityRecognitionEvent) => void;
};

const nativeModule = requireOptionalNativeModule<NativeActivityRecognitionModule>(
  'ParkingActivityRecognition'
);
const emitter = nativeModule;
let activitySubscription: EventSubscription | null = null;

/** Requests the platform's motion/activity permission after the user opts in. */
export async function requestPermission(): Promise<boolean> {
  if (!nativeModule) return false;
  return nativeModule.requestPermission();
}

/** Starts platform recognition and sends normalized signals to the caller. */
export async function startActivityUpdates(
  listener: (event: ActivityRecognitionEvent) => void
): Promise<void> {
  if (!nativeModule || !emitter) {
    throw new Error('Native activity recognition is unavailable in this app runtime.');
  }

  await stopActivityUpdates();
  const subscription = emitter.addListener('onActivity', listener);
  activitySubscription = subscription;
  try {
    await nativeModule.startActivityUpdates();
  } catch (error) {
    subscription.remove();
    activitySubscription = null;
    throw error;
  }
}

/** Stops platform recognition and removes the JavaScript event listener. */
export async function stopActivityUpdates(): Promise<void> {
  activitySubscription?.remove();
  activitySubscription = null;
  await nativeModule?.stopActivityUpdates();
}
