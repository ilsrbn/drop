export interface DropDiagnostic {
  message: string
  start: number
  end: number
  severity: 'error' | 'warning'
}

export interface DropBlockRange {
  openingTagStart: number
  openingTagEnd: number
  contentStart: number
  contentEnd: number
  closingTagStart: number
  closingTagEnd: number
  language: string
  content: string
}

export interface ParsedDropDocument {
  filename: string
  source: string
  block: DropBlockRange | null
  diagnostics: DropDiagnostic[]
}

export interface SourceMapping {
  sourceStart: number
  sourceEnd: number
  generatedStart: number
  generatedEnd: number
}
