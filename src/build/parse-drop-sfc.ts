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
  if (roots.length !== 1 || roots[0]?.type !== 1 || roots[0].tag === 'component' || /^[A-Z]/.test(roots[0].tag)) {
    throw new Error(`${filename}: a Drop component requires one HTML root element`)
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

  return {
    behavior: {
      code: dropBlock.content,
      filename,
      id: filename.split('/').at(-1)?.replace(/\.vue$/, '') ?? filename,
      lang: dropBlock.lang ?? 'js',
    },
    vueSource: output.toString(),
  }
}
