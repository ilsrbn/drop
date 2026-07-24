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

const forbiddenImportPattern = /(?:from\s*|import\s*)["'](vue|#app|#imports|nu(?:xt)?(?:\/[^"']*)?)["']/g

export function parseDropSfc(filename: string, source: string): ParsedDropSfc | null {
  const { descriptor, errors } = parse(source, { filename })

  if (errors.length > 0) {
    throw new Error(`${filename}: ${errors.map(String).join('\n')}`)
  }

  const dropBlocks = descriptor.customBlocks.filter(block => block.type === 'drop')
  const hasDropState = /\bdefineDropState\s*\(/.test(source)

  if (dropBlocks.length === 0) {
    if (hasDropState) {
      throw new Error(`${filename}: defineDropState requires a <drop> block`)
    }

    return null
  }

  if (dropBlocks.length > 1) {
    throw new Error(`${filename}: a component can contain only one <drop> block`)
  }

  const template = descriptor.template
  if (!template?.ast) {
    throw new Error(`${filename}: a Drop component requires a <template>`)
  }

  const roots = template.ast.children.filter(node => node.type === 1)
  const root = roots[0]
  if (roots.length !== 1 || !root || root.tag === 'component' || /^[A-Z]/.test(root.tag)) {
    throw new Error(`${filename}: a Drop component requires one HTML root element`)
  }

  if (!descriptor.scriptSetup) {
    throw new Error(`${filename}: a Drop component requires <script setup>`)
  }

  if (!hasDropState) {
    throw new Error(`${filename}: a Drop component requires defineDropState`)
  }

  const dropBlock = dropBlocks[0]
  if (!dropBlock) {
    throw new Error(`${filename}: a component can contain only one <drop> block`)
  }
  const forbiddenImport = forbiddenImportPattern.exec(dropBlock.content)
  forbiddenImportPattern.lastIndex = 0

  if (forbiddenImport) {
    throw new Error(`${filename}: <drop> cannot import "${forbiddenImport[1]}"`)
  }

  const output = new MagicString(source)
  const blockStart = source.lastIndexOf('<drop', dropBlock.loc.start.offset)
  const blockEnd = source.indexOf('</drop>', dropBlock.loc.end.offset) + '</drop>'.length
  output.remove(blockStart, blockEnd)

  const behaviorId = filename.split('/').at(-1)?.replace(/\.vue$/, '') ?? filename
  const setup = descriptor.scriptSetup
  const macro = /\bdefineDropState\s*\(/.exec(setup.content)
  if (!macro || macro.index === undefined) {
    throw new Error(`${filename}: a Drop component requires defineDropState`)
  }

  const macroStart = setup.loc.start.offset + macro.index
  const macroEnd = macroStart + macro[0].length
  output.appendLeft(setup.loc.start.offset, 'import { createDropState } from "#drop/server"\n')
  output.overwrite(macroStart, macroEnd, `const __drop = createDropState("${behaviorId}", `)

  const rootTagEnd = source.indexOf('>', root.loc.start.offset)
  output.appendLeft(rootTagEnd, ` data-drop-root="${behaviorId}" :data-drop-state="__drop.serialized"`)

  return {
    behavior: {
      code: dropBlock.content,
      filename,
      id: behaviorId,
      lang: dropBlock.lang ?? 'js',
    },
    vueSource: output.toString(),
  }
}
