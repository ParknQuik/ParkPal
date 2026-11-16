import { isRunningInExpoGo } from 'expo';
import Constants from 'expo-constants';
import { createNotificationService } from './notificationServiceFactory';
import type { ExpoNotificationsModule } from './notificationServiceFactory';

declare const require: (moduleName: string) => ExpoNotificationsModule;

const isExpoGo = (): boolean => {
  const constants = Constants as typeof Constants & {
    appOwnership?: string | null;
    executionEnvironment?: string | null;
  };

  return (
    isRunningInExpoGo() ||
    constants.appOwnership === 'expo' ||
    constants.executionEnvironment === 'storeClient'
  );
};

const getProjectId = (): string | undefined => {
  const constants = Constants as typeof Constants & {
    easConfig?: { projectId?: string };
  };

  return constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
};

export const notificationService = createNotificationService({
  isExpoGo,
  loadNotifications: () => require('expo-notifications'),
  getProjectId,
});
