import { Command, given, message, model, story } from 'foldkit/story'
import { describe, expect, test } from 'vitest'

import { type Annotations, EMPTY } from '../annotate/model'
import { Message } from './message'
import { FormatState, TRANSPARENT, currentAnnotations } from './model'
import { cutLineCount, scene, size } from './scene'
import { FormatCode, imageFileName, init, update } from './update'

const initModel = init().model

const LONG_LINE = `fn main() -> () {\n  let total = ${'1 + '.repeat(60)}1\n}\n`

describe('snippet', () => {
  test('formatting replaces the code with the formatter output', () => {
    story(
      update,
      given(initModel),
      message(Message.ChangedCode({ code: 'fn main()->(){}' })),
      message(Message.ClickedFormat()),
      model(model => {
        expect(model.formatState).toEqual(FormatState.Formatting())
      }),
      Command.resolve(
        FormatCode,
        Message.SucceededFormat({ code: 'fn main() -> () {}\n' }),
      ),
      model(model => {
        expect(model.settings.code).toBe('fn main() -> () {}\n')
        expect(model.formatState).toEqual(FormatState.Idle())
      }),
    )
  })

  test('a code the formatter refuses stays as it was', () => {
    story(
      update,
      given(initModel),
      message(Message.ChangedCode({ code: 'fn main( {' })),
      message(Message.ClickedFormat()),
      Command.resolve(
        FormatCode,
        Message.FailedFormat({
          message: 'cannot format damaged source (PAR0001)',
        }),
      ),
      model(model => {
        expect(model.settings.code).toBe('fn main( {')
        expect(model.formatState).toEqual(
          FormatState.Failed({
            message: 'cannot format damaged source (PAR0001)',
          }),
        )
      }),
    )
  })

  test('the width stays within its limits and ignores text', () => {
    story(
      update,
      given(initModel),
      message(Message.ChangedWidth({ value: '99999' })),
      model(model => {
        expect(model.settings.width).toBe(2400)
      }),
      message(Message.ChangedWidth({ value: 'wide' })),
      model(model => {
        expect(model.settings.width).toBe(2400)
      }),
    )
  })

  test('fitting the width shows every line whole', () => {
    story(
      update,
      given(initModel),
      message(Message.ChangedCode({ code: LONG_LINE })),
      model(model => {
        expect(cutLineCount(model.settings, EMPTY)).toBe(1)
      }),
      message(Message.ClickedFitWidth()),
      model(model => {
        expect(cutLineCount(model.settings, EMPTY)).toBe(0)
      }),
    )
  })
})

describe('snippet scene', () => {
  test('the scale multiplies the image size', () => {
    const settings = { ...initModel.settings, scale: 2 }
    const { width, height } = size(settings, EMPTY)
    const image = scene(settings, EMPTY)
    expect(image.width).toBe(width * 2)
    expect(image.height).toBe(height * 2)
  })

  test('the window bar adds to the height', () => {
    const withWindow = size({ ...initModel.settings, showWindow: true }, EMPTY)
    const without = size({ ...initModel.settings, showWindow: false }, EMPTY)
    expect(withWindow.height - without.height).toBe(53)
  })

  test('no background leaves the corners transparent', () => {
    const [group] = scene(
      {
        ...initModel.settings,
        background: TRANSPARENT,
      },
      EMPTY,
    ).shapes
    expect(group?._tag).toBe('Group')
    const first = group?._tag === 'Group' ? group.shapes[0] : undefined
    expect(first?._tag).toBe('Path')
  })

  test('symbols are drawn apart so the font cannot join them', () => {
    const [group] = scene(
      {
        ...initModel.settings,
        code: 'fn f(a: bool) -> bool {\n  a || a != false\n}\n',
      },
      EMPTY,
    ).shapes
    const texts =
      group?._tag === 'Group'
        ? group.shapes.flatMap(shape =>
            shape._tag === 'Text' ? [shape.content] : [],
          )
        : []
    expect(texts).toContain('>')
    expect(texts.filter(text => /[^A-Za-z_]{2}/.test(text))).toEqual([])
  })

  test('the image is named after the file', () => {
    expect(imageFileName('counter.silk')).toBe('counter.png')
    expect(imageFileName('  ')).toBe('snippet.png')
  })
})

const CHECKED = 'fn main() -> () {\n  let answer = 42\n  //  ^?\n}\n'

const ANNOTATIONS: Annotations = {
  diagnostics: [
    {
      line: 1,
      start: 6,
      end: 12,
      severity: 'Error',
      code: 'SEM0255',
      message: 'answer is never used',
    },
  ],
  hovers: [
    { line: 1, start: 6, end: 12, text: 'let answer: i32', isPinned: true },
  ],
  hints: [{ line: 1, column: 12, label: ': i32' }],
}

const textsOf = (shapes: ReturnType<typeof scene>['shapes']) => {
  const [group] = shapes
  return group?._tag === 'Group'
    ? group.shapes.flatMap(shape => (shape._tag === 'Text' ? [shape] : []))
    : []
}

describe('snippet annotations', () => {
  test('annotations for older code are not drawn', () => {
    story(
      update,
      given(initModel),
      message(Message.ChangedCode({ code: CHECKED })),
      message(
        Message.ReceivedAnnotations({
          code: CHECKED,
          annotations: ANNOTATIONS,
        }),
      ),
      model(model => {
        expect(currentAnnotations(model)).toEqual(ANNOTATIONS)
      }),
      message(Message.ChangedCode({ code: `${CHECKED}\n` })),
      model(model => {
        expect(currentAnnotations(model)).toEqual(EMPTY)
      }),
    )
  })

  test('markers are not drawn, and an error and a pinned hover add rows', () => {
    const settings = {
      ...initModel.settings,
      code: CHECKED,
      showInlayHints: false,
    }
    const plain = size(settings, EMPTY)
    const annotated = size(settings, ANNOTATIONS)
    expect(annotated.height).toBeGreaterThan(plain.height)
    const contents = textsOf(scene(settings, EMPTY).shapes).map(
      text => text.content,
    )
    expect(contents).not.toContain('^')
    expect(contents).not.toContain('?')
    expect(
      size({ ...settings, showErrors: false }, ANNOTATIONS).height,
    ).toBeLessThan(annotated.height)
  })

  test('an inlay hint pushes the rest of its line right', () => {
    const settings = {
      ...initModel.settings,
      code: CHECKED,
      showInlayHints: true,
    }
    const equalsX = (annotations: Annotations) =>
      textsOf(scene(settings, annotations).shapes).find(
        text => text.content === '=',
      )?.x ?? 0
    expect(equalsX(ANNOTATIONS) - equalsX(EMPTY)).toBeCloseTo(
      ': i32'.length * 14 * 0.6,
    )
  })
})
