import ts from 'typescript'
import { getDropDiagnostics as getCustomDiagnostics } from './diagnostics'
import { createDropVirtualDocument, type DropVirtualDocument } from './virtual-document'
import type { DropDiagnostic, ParsedDropDocument } from './types'
import { dirname, join } from 'node:path'

export interface DropTypeScriptServiceOptions {
  workspaceRoot?: string
  projectRoot?: string
  compilerOptions?: ts.CompilerOptions
  files?: Record<string, string> | string[]
  getScriptFileNames?: () => string[]
  getScriptSnapshot?: (fileName: string) => ts.IScriptSnapshot | undefined
}

/** A TypeScript definition whose file name may point back to the source SFC. */
export type DropDefinitionInfo = ts.DefinitionInfo

export interface DropTypeScriptService {
  virtualDocument: DropVirtualDocument
  languageService: ts.LanguageService
  getDropDiagnostics(): DropDiagnostic[]
  getCompletionsAtPosition(sourceOffset: number, options?: ts.GetCompletionsAtPositionOptions): (ts.CompletionInfo & { items: readonly ts.CompletionEntry[] }) | undefined
  getDefinitionAtPosition(sourceOffset: number): DropDefinitionInfo[] | undefined
}

function asFileMap(files: DropTypeScriptServiceOptions['files']): Map<string, string> {
  if (!files) return new Map()
  if (Array.isArray(files)) return new Map(files.map(file => [file, '']))
  return new Map(Object.entries(files))
}

function diagnosticMessage(message: ts.DiagnosticMessageChain | string): string {
  return typeof message === 'string' ? message : ts.flattenDiagnosticMessageText(message, '\n')
}

export function createDropTypeScriptService(parsed: ParsedDropDocument, options: DropTypeScriptServiceOptions = {}): DropTypeScriptService {
  const virtualDocument = createDropVirtualDocument(parsed, options)
  const projectFiles = asFileMap(options.files)
  const virtualName = virtualDocument.fileName
  const fileNames = new Set<string>([...projectFiles.keys(), virtualName])
  for (const fileName of options.getScriptFileNames?.() || []) fileNames.add(fileName)
  const snapshots = new Map<string, ts.IScriptSnapshot>()
  const compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    strict: true,
    allowJs: true,
    allowSyntheticDefaultImports: true,
    skipLibCheck: true,
    jsx: ts.JsxEmit.Preserve,
    ...options.compilerOptions,
  }
  const currentDirectory = options.projectRoot || options.workspaceRoot || '/'
  const host: ts.LanguageServiceHost = {
    getCompilationSettings: () => compilerOptions,
    getScriptFileNames: () => [...fileNames],
    getScriptVersion: () => '0',
    getCurrentDirectory: () => currentDirectory,
    getDefaultLibFileName: opts => ts.getDefaultLibFilePath(opts),
    getScriptSnapshot: (fileName) => {
      if (fileName === virtualName) return ts.ScriptSnapshot.fromString(virtualDocument.text)
      const custom = options.getScriptSnapshot?.(fileName)
      if (custom) return custom
      if (snapshots.has(fileName)) return snapshots.get(fileName)
      const text = projectFiles.get(fileName) ?? ts.sys.readFile(fileName)
      if (text == null) return undefined
      const snapshot = ts.ScriptSnapshot.fromString(text)
      snapshots.set(fileName, snapshot)
      return snapshot
    },
    fileExists: fileName => fileName === virtualName || projectFiles.has(fileName) || ts.sys.fileExists(fileName),
    readFile: fileName => fileName === virtualName ? virtualDocument.text : projectFiles.get(fileName) ?? ts.sys.readFile(fileName),
    readDirectory: ts.sys.readDirectory,
    resolveModuleNames: (moduleNames, containingFile) => moduleNames.map((moduleName) => {
      if (containingFile !== virtualName || !moduleName.startsWith('.')) return ts.resolveModuleName(moduleName, containingFile, compilerOptions, { ...ts.sys, fileExists: host.fileExists, readFile: host.readFile }).resolvedModule
      const base = parsed.filename.replace(/[^/\\]+$/, '')
      const candidate = `${base}${moduleName.slice(2)}`
      const candidates = [candidate, `${candidate}.ts`, `${candidate}.tsx`, `${candidate}.js`, `${candidate}.d.ts`]
      const fileName = candidates.find(file => host.fileExists?.(file))
      return fileName ? { resolvedFileName: fileName, extension: fileName.endsWith('.d.ts') ? ts.Extension.Dts : fileName.endsWith('.js') ? ts.Extension.Js : ts.Extension.Ts } : undefined
    }),
  }
  const languageService = ts.createLanguageService(host)

  function mapDiagnostics(diagnostics: readonly ts.Diagnostic[]): DropDiagnostic[] {
    return diagnostics.flatMap((item) => {
      if (item.start == null || item.length == null) return []
      const start = virtualDocument.toSourceOffset(item.start)
      const end = virtualDocument.toSourceOffset(item.start + item.length)
      if (start == null || end == null) return []
      return [{ message: diagnosticMessage(item.messageText), start, end, severity: item.category === ts.DiagnosticCategory.Warning ? 'warning' : 'error' }]
    })
  }

  function mapDefinition(definition: ts.DefinitionInfo): DropDefinitionInfo | undefined {
    if (definition.fileName !== virtualName) return definition
    const start = virtualDocument.toSourceOffset(definition.textSpan.start)
    const end = virtualDocument.toSourceOffset(definition.textSpan.start + definition.textSpan.length)
    if (start == null || end == null) return undefined
    return {
      ...definition,
      fileName: parsed.filename,
      textSpan: { start, length: end - start },
    }
  }

  function getTypeScriptDiagnostics(): DropDiagnostic[] {
    if (!parsed.block || !['js', 'ts'].includes(parsed.block.language)) return []
    return [...mapDiagnostics(languageService.getSemanticDiagnostics(virtualName)), ...mapDiagnostics(languageService.getSyntacticDiagnostics(virtualName))]
  }

  return {
    virtualDocument,
    languageService,
    getDropDiagnostics: () => [...parsed.diagnostics, ...getCustomDiagnostics(parsed), ...getTypeScriptDiagnostics()],
    getCompletionsAtPosition: (sourceOffset, completionOptions) => {
      const position = virtualDocument.toVirtualOffset(sourceOffset)
      const result = position == null ? undefined : languageService.getCompletionsAtPosition(virtualName, position, completionOptions)
      return result ? Object.assign(result, { items: result.entries }) : undefined
    },
    getDefinitionAtPosition: (sourceOffset) => {
      const position = virtualDocument.toVirtualOffset(sourceOffset)
      if (position == null) return undefined
      const definitions = languageService.getDefinitionAtPosition(virtualName, position)?.map(mapDefinition).filter((definition): definition is DropDefinitionInfo => definition != null)
      if (definitions?.some(definition => definition.fileName !== parsed.filename)) return definitions
      const word = /[\w$]+/.exec(virtualDocument.text.slice(position).match(/^[\w$]+/)?.[0] || '')?.[0]
      if (!word) return definitions
      const importMatch = new RegExp(`import\\s*\\{[^}]*\\b${word}\\b[^}]*\\}\\s*from\\s*["']([^"']+)["']`).exec(parsed.block?.content || '')
      if (!importMatch || !importMatch[1].startsWith('.')) return definitions
      const base = join(dirname(parsed.filename), importMatch[1])
      const target = [base, `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.d.ts`].find(file => projectFiles.has(file))
      if (!target) return definitions
      const targetText = projectFiles.get(target) || ''
      const declaration = new RegExp(`\\b(?:export\\s+)?(?:const|let|var|function|class|interface|type)\\s+${word}\\b`).exec(targetText)
      return [{
        fileName: target,
        textSpan: { start: declaration?.index ?? 0, length: word.length },
        kind: ts.ScriptElementKind.constElement,
        name: word,
        containerName: '',
        containerKind: ts.ScriptElementKind.unknown,
      }]
    },
  }
}
