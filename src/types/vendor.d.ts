declare module 'adm-zip';
declare module 'node-cron' {
  export interface ScheduledTask {
    stop: () => void;
  }

  export function schedule(
    expression: string,
    callback: () => void | Promise<void>,
    options?: Record<string, unknown>
  ): ScheduledTask;
}
