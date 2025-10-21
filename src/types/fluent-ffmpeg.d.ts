declare module 'fluent-ffmpeg' {
  export interface FfmpegCommand {
    input(path: string): FfmpegCommand;
    inputOptions(options: string[]): FfmpegCommand;
    output(path: string): FfmpegCommand;
    outputOptions(options: string[]): FfmpegCommand;
    once(event: 'end', handler: () => void): FfmpegCommand;
    once(event: 'error', handler: (error: Error) => void): FfmpegCommand;
    run(): void;
  }

  export interface FluentFfmpegStatic {
    (input?: string): FfmpegCommand;
    setFfmpegPath(path: string): void;
  }

  const fluentFfmpeg: FluentFfmpegStatic;
  export default fluentFfmpeg;
}
