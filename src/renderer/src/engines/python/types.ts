export interface PythonRunResult {
  /** Everything the code printed (stdout and stderr), in order. */
  output: string
  /** str() of the last expression, if the code ended with one. */
  value: string | null
}
