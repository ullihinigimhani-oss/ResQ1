const DEFAULT_TEXTBEE_TIMEOUT_MS = 15_000;

export type TextbeeConfig = {
  apiKey: string;
  baseUrl: string;
  deviceId: string;
};

export type TextbeeSendResult = {
  acceptedRecipients: number;
  provider: 'TEXTBEE';
  providerBatchId: string | null;
};

type TextbeeRuntimeOptions = {
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

export class TextbeeServiceError extends Error {
  constructor(
    message: string,
    public readonly code: 'CONFIGURATION' | 'PROVIDER' | 'TIMEOUT',
  ) {
    super(message);
    this.name = 'TextbeeServiceError';
  }
}

function trimmedText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export function normalizeSriLankanPhoneNumber(value: unknown) {
  const compactNumber = trimmedText(value).replace(/[\s()-]+/g, '');
  const localMatch = /^0(7\d{8})$/.exec(compactNumber);

  if (localMatch) {
    return `+94${localMatch[1]}`;
  }

  return /^\+947\d{8}$/.test(compactNumber) ? compactNumber : null;
}

export function getTextbeeConfig(env: NodeJS.ProcessEnv = process.env): TextbeeConfig {
  const baseUrl = trimmedText(env.TEXTBEE_BASE_URL).replace(/\/+$/, '');
  const apiKey = trimmedText(env.TEXTBEE_API_KEY);
  const deviceId = trimmedText(env.TEXTBEE_DEVICE_ID);

  if (!baseUrl || !apiKey || !deviceId) {
    throw new TextbeeServiceError(
      'TextBee SMS configuration is incomplete.',
      'CONFIGURATION',
    );
  }

  try {
    const parsedBaseUrl = new URL(baseUrl);

    if (parsedBaseUrl.protocol !== 'https:' && parsedBaseUrl.protocol !== 'http:') {
      throw new Error('Unsupported protocol.');
    }
  } catch {
    throw new TextbeeServiceError(
      'TextBee SMS configuration contains an invalid base URL.',
      'CONFIGURATION',
    );
  }

  return { apiKey, baseUrl, deviceId };
}

function providerBatchIdFromResponse(value: unknown) {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const response = value as Record<string, unknown>;
  const data = response.data && typeof response.data === 'object'
    ? response.data as Record<string, unknown>
    : null;
  const batchId = data?.smsBatchId ?? response.smsBatchId;

  return typeof batchId === 'string' && batchId.trim() ? batchId.trim() : null;
}

export async function sendSmsViaTextbee(
  recipients: readonly string[],
  message: string,
  options: TextbeeRuntimeOptions = {},
): Promise<TextbeeSendResult> {
  if (recipients.length === 0) {
    throw new TextbeeServiceError('At least one SMS recipient is required.', 'PROVIDER');
  }

  if (!message.trim()) {
    throw new TextbeeServiceError('The SMS message cannot be empty.', 'PROVIDER');
  }

  const config = getTextbeeConfig(options.env);
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TEXTBEE_TIMEOUT_MS;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(`${config.baseUrl}/gateway/send-sms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
      },
      body: JSON.stringify({
        deviceId: config.deviceId,
        recipients,
        message,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new TextbeeServiceError(
        `TextBee SMS service returned HTTP ${response.status}.`,
        'PROVIDER',
      );
    }

    const responseText = await response.text();
    let responseBody: unknown = null;

    if (responseText) {
      try {
        responseBody = JSON.parse(responseText);
      } catch {
        responseBody = null;
      }
    }

    return {
      acceptedRecipients: recipients.length,
      provider: 'TEXTBEE',
      providerBatchId: providerBatchIdFromResponse(responseBody),
    };
  } catch (error) {
    if (error instanceof TextbeeServiceError) {
      throw error;
    }

    if (controller.signal.aborted) {
      throw new TextbeeServiceError('TextBee SMS request timed out.', 'TIMEOUT');
    }

    throw new TextbeeServiceError('TextBee SMS request failed.', 'PROVIDER');
  } finally {
    clearTimeout(timeout);
  }
}
