import type { Alert } from '../types/alert.js';
import { dispatchBasicPhoneAlertSms } from './alertSmsService.js';
import { sendAlertPushNotifications } from './notificationService.js';

type AlertDeliveryDependencies = {
  dispatchSms: typeof dispatchBasicPhoneAlertSms;
  logError: (message: string, error: unknown) => void;
  logInfo: (message: string) => void;
  sendPushNotifications: typeof sendAlertPushNotifications;
};

const defaultDependencies: AlertDeliveryDependencies = {
  dispatchSms: dispatchBasicPhoneAlertSms,
  logError: (message, error) => console.error(message, error),
  logInfo: (message) => console.info(message),
  sendPushNotifications: sendAlertPushNotifications,
};

export function dispatchPublishedAlertDeliveries(
  alert: Alert,
  dependencies: AlertDeliveryDependencies = defaultDependencies,
) {
  void dependencies.sendPushNotifications(alert).catch((error) => {
    dependencies.logError(`Alert push notification dispatch failed for alert ${alert.id}:`, error);
  });

  void dependencies.dispatchSms(alert)
    .then((result) => {
      if (result.status === 'SENT_TO_GATEWAY') {
        dependencies.logInfo(
          `Basic phone alert SMS accepted by the gateway for alert ${alert.id}: ${result.recipientCount} recipient(s).`,
        );
      }
    })
    .catch((error) => {
      const message = error instanceof Error ? error.message : 'Unexpected SMS dispatch failure.';

      dependencies.logError(`Basic phone alert SMS dispatch failed for alert ${alert.id}:`, message);
    });
}
