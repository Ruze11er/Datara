export interface PythonRunResult {
  /** Everything the code printed (stdout and stderr), in order. */
  output: string
  /** str() of the last expression, if the code ended with one. */
  value: string | null
}

export interface PyError {
  type: string
  message: string
  /** Line in the learner's code, if known. */
  line: number | null
  /** Beginner-friendly explanation. */
  friendly: string
}

export interface PyTable {
  columns: string[]
  rows: (string | number | null)[][]
  totalRows: number
}

export interface PyVariable {
  name: string
  type: string
  value: string
  /** True if it came from the level's given data. */
  given: boolean
  table?: PyTable
}

export interface PyLabRun {
  output: string
  error: PyError | null
  variables: PyVariable[]
}

export interface PyLabCheck extends PyLabRun {
  pass: boolean
  title: string
  message: string
  /** Shown when the printed output doesn't match. */
  expectedOutput: string | null
}

export interface PyCheckSpec {
  setup: string
  code: string
  solution: string
  expect: string[]
  checkOutput: boolean
  variants: string[]
  calls: string[]
}
