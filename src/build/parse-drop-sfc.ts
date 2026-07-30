import { parse as parseJavaScript } from '@babel/parser'
import { basename, isAbsolute, relative } from 'node:path'
import MagicString from 'magic-string'
import { parse } from 'vue/compiler-sfc'

export interface DropBehaviorSource {
  code: string
  filename: string
  id: string
  lang: string
}

export interface ParsedDropSfc {
  behavior: DropBehaviorSource
  vueSource: string
}

interface MacroCall {
  callback: { body: { end: number, start: number, type: string }, end: number, start: number }
  end: number
  start: number
  state: { end: number, start: number }
}

export function parseDropSfc(filename: string, source: string, srcDir?: string): ParsedDropSfc | null {
  const { descriptor, errors } = parse(source, { filename })

  if (errors.length > 0) {
    throw new Error(`${filename}: ${errors.map(String).join('\n')}`)
  }

  if (descriptor.customBlocks.some(block => block.type === 'drop')) {
    throw new Error(`${filename}: <drop> blocks are no longer supported; use defineDrop({ state }, callback)`)
  }

  if (!descriptor.scriptSetup) {
    return null
  }

  const template = descriptor.template
  const macro = findDefineDropMacro(filename, descriptor.scriptSetup.content)
  if (!macro) {
    return null
  }

  if (!template?.ast) {
    throw new Error(`${filename}: a Drop component requires a <template>`)
  }

  const roots = template.ast.children.filter(node => node.type === 1)
  const root = roots[0]
  if (roots.length !== 1 || !root || root.tag === 'component' || /^[A-Z]/.test(root.tag)) {
    throw new Error(`${filename}: a Drop component requires one HTML root element`)
  }

  const behaviorId = createBehaviorId(filename, srcDir)
  const setup = descriptor.scriptSetup
  const macroStart = setup.loc.start.offset + macro.start
  const macroEnd = setup.loc.start.offset + macro.end
  const state = setup.content.slice(macro.state.start, macro.state.end)
  const callbackBody = macro.callback.body.type === 'BlockStatement'
    ? setup.content.slice(macro.callback.body.start + 1, macro.callback.body.end - 1)
    : `return ${setup.content.slice(macro.callback.body.start, macro.callback.body.end)}`

  const output = new MagicString(source)
  output.appendLeft(setup.loc.start.offset, 'import { useHead } from "#imports"\nimport { createDropState } from "#drop/server"\n')
  output.overwrite(macroStart, macroEnd, `const __drop = createDropState(useHead, "${behaviorId}", ${state})`)

  const rootTagEnd = source.indexOf('>', root.loc.start.offset)
  output.appendLeft(rootTagEnd, ` data-drop-root="${behaviorId}" :data-drop-state="__drop.serialized"`)

  return {
    behavior: {
      code: callbackBody,
      filename,
      id: behaviorId,
      lang: setup.lang ?? 'js',
    },
    vueSource: output.toString(),
  }
}

function findDefineDropMacro(filename: string, source: string): MacroCall | null {
  const ast = parseJavaScript(source, {
    plugins: ['typescript'],
    sourceType: 'module',
  })
  const macros: MacroCall[] = []
  const topLevelBindings = new Set<string>()

  for (const statement of ast.program.body) {
    if (statement.type === 'ImportDeclaration') {
      statement.specifiers.forEach(specifier => topLevelBindings.add(specifier.local.name))
    }
    else if (statement.type === 'VariableDeclaration') {
      statement.declarations.forEach((declaration) => {
        if (declaration.id.type === 'Identifier') {
          topLevelBindings.add(declaration.id.name)
        }
      })
    }
    else if ((statement.type === 'FunctionDeclaration' || statement.type === 'ClassDeclaration') && statement.id) {
      topLevelBindings.add(statement.id.name)
    }

    if (statement.type !== 'ExpressionStatement' || statement.expression.type !== 'CallExpression') {
      continue
    }

    const call = statement.expression
    if (call.callee.type !== 'Identifier' || call.callee.name !== 'defineDrop') {
      continue
    }

    const [options, callback] = call.arguments
    if (!options || options.type !== 'ObjectExpression' || !callback || (callback.type !== 'ArrowFunctionExpression' && callback.type !== 'FunctionExpression')) {
      throw new Error(`${filename}: defineDrop requires an options object and one inline function`)
    }

    const stateProperty = options.properties.find(property => property.type === 'ObjectProperty'
      && property.key.type === 'Identifier'
      && property.key.name === 'state')
    if (!stateProperty || stateProperty.type !== 'ObjectProperty') {
      throw new Error(`${filename}: defineDrop options require a state property`)
    }

    if (callback.params.length !== 1 || callback.params[0]?.type !== 'Identifier' || callback.params[0].name !== 'ctx') {
      throw new Error(`${filename}: defineDrop callback requires one ctx parameter`)
    }

    const callbackRange = rangeOf(callback, filename)
    const callbackBodyRange = rangeOf(callback.body, filename)
    const stateRange = rangeOf(stateProperty.value, filename)
    const callbackSource = source.slice(callbackBodyRange.start, callbackBodyRange.end)
    if (/\bctx\.load\s*\(\s*(?!['"])/.test(callbackSource)) {
      throw new Error(`${filename}: ctx.load requires a string-literal module specifier`)
    }

    for (const binding of topLevelBindings) {
      if (new RegExp(`\\b${escapeRegExp(binding)}\\b`).test(callbackSource)) {
        throw new Error(`${filename}: defineDrop cannot capture "${binding}"; pass server values through options.state or declare browser-only values inside the callback`)
      }
    }

    macros.push({
      callback: {
        body: { ...callbackBodyRange, type: callback.body.type },
        ...callbackRange,
      },
      ...rangeOf(call, filename),
      state: stateRange,
    })
  }

  if (macros.length > 1) {
    throw new Error(`${filename}: a component can contain only one defineDrop call`)
  }

  return macros[0] ?? null
}

function createBehaviorId(filename: string, srcDir?: string): string {
  const relativeFilename = srcDir && isAbsolute(filename)
    ? relative(srcDir, filename)
    : filename
  const encodedPath = Buffer.from(relativeFilename.replaceAll('\\', '/')).toString('base64url')

  return `${basename(filename, '.vue')}--${encodedPath}`
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function rangeOf(node: { end?: number | null, start?: number | null }, filename: string): { end: number, start: number } {
  if (node.start == null || node.end == null) {
    throw new Error(`${filename}: defineDrop could not determine a source range`)
  }

  return { end: node.end, start: node.start }
}
