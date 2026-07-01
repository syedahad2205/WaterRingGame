import functions from '@react-native-firebase/functions';

export type FunctionName =
  | 'submitScore'
  | 'creditCoins'
  | 'spendCoins'
  | 'getDailyChallenge'
  | 'getLeaderboard'
  | 'uploadReplayMeta'
  | 'reportAntiCheat'
  | 'updateUser'
  | 'unlockAchievement';

export interface FunctionCallOptions {
  timeoutMs?: number;
}

export interface FunctionResult<T> {
  data: T;
  success: boolean;
  error?: string;
}

const DEFAULT_TIMEOUT_MS = 15_000;

export class CloudFunctionsService {
  private static instance: CloudFunctionsService | null = null;
  private emulatorConfigured = false;

  private constructor() { /* intentional no-op */ }

  static getInstance(): CloudFunctionsService {
    if (!CloudFunctionsService.instance) {
      CloudFunctionsService.instance = new CloudFunctionsService();
    }
    return CloudFunctionsService.instance;
  }

  async call<TPayload, TResult>(
    name: FunctionName,
    payload: TPayload,
    options?: FunctionCallOptions,
  ): Promise<FunctionResult<TResult>> {
    const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    const callable = functions().httpsCallable(name, { timeout: timeoutMs });

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error(`Function "${name}" timed out after ${timeoutMs}ms`)),
        timeoutMs,
      );
    });

    try {
      const result = await Promise.race([
        callable(payload),
        timeoutPromise,
      ]);
      return {
        data: result.data as TResult,
        success: true,
      };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      if (__DEV__) console.warn(`[CloudFunctionsService] call("${name}") error:`, message);
      return {
        data: null as unknown as TResult,
        success: false,
        error: message,
      };
    }
  }

  useEmulator(host: string, port: number): void {
    if (this.emulatorConfigured) return;
    functions().useEmulator(host, port);
    this.emulatorConfigured = true;
    if (__DEV__) console.log(`[CloudFunctionsService] Using emulator at ${host}:${port}`);
  }
}

export const cloudFunctionsService = CloudFunctionsService.getInstance();
