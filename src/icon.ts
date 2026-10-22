import { type Html, type HtmlBuilder } from 'foldkit/html'

// Icons from the design's resources/assets/icons. They draw with currentColor,
// so they follow the text color of whatever contains them.

const strokeIcon = <Message>(
  pathData: string,
  className: string,
  h: HtmlBuilder<Message>,
): Html =>
  h.svg(
    [
      h.ViewBox('0 0 16 16'),
      h.Fill('none'),
      h.Stroke('currentColor'),
      h.StrokeWidth('1.75'),
      h.StrokeLinecap('round'),
      h.StrokeLinejoin('round'),
      h.AriaHidden(true),
      h.Class(className),
    ],
    [h.path([h.D(pathData)])],
  )

export const arrowLeft = <Message>(
  className: string,
  h: HtmlBuilder<Message>,
): Html => strokeIcon('M14 8H3M7 4L3 8l4 4', className, h)

export const arrowRight = <Message>(
  className: string,
  h: HtmlBuilder<Message>,
): Html => strokeIcon('M2 8h11M9 4l4 4-4 4', className, h)

export const arrowUpRight = <Message>(
  className: string,
  h: HtmlBuilder<Message>,
): Html => strokeIcon('M4.5 11.5l7-7M5.5 4.5h6v6', className, h)

export const chevronDown = <Message>(
  className: string,
  h: HtmlBuilder<Message>,
): Html => strokeIcon('M3.5 6L8 10.5L12.5 6', className, h)

export const chevronRight = <Message>(
  className: string,
  h: HtmlBuilder<Message>,
): Html => strokeIcon('M6 3.5L10.5 8L6 12.5', className, h)

export const copy = <Message>(
  className: string,
  h: HtmlBuilder<Message>,
): Html =>
  h.svg(
    [
      h.ViewBox('0 0 16 16'),
      h.Fill('none'),
      h.Stroke('currentColor'),
      h.StrokeWidth('1.5'),
      h.AriaHidden(true),
      h.Class(className),
    ],
    [
      h.rect([
        h.X('5.5'),
        h.Y('5.5'),
        h.Width('8'),
        h.Height('8'),
        h.Rx('1.75'),
      ]),
      h.path([
        h.D(
          'M10.5 3.25V3.5A1.25 1.25 0 0 0 9.25 2.25H3.75A1.5 1.5 0 0 0 2.25 3.75v5.5A1.25 1.25 0 0 0 3.5 10.5',
        ),
        h.StrokeLinecap('round'),
      ]),
    ],
  )

export const info = <Message>(
  className: string,
  h: HtmlBuilder<Message>,
): Html =>
  h.svg(
    [
      h.ViewBox('0 0 16 16'),
      h.Fill('currentColor'),
      h.AriaHidden(true),
      h.Class(className),
    ],
    [
      h.path([
        h.FillRule('evenodd'),
        h.D(
          'M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0Zm0 6.75a.9.9 0 0 0-.9.9v4a.9.9 0 0 0 1.8 0v-4a.9.9 0 0 0-.9-.9ZM8 3.6a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2Z',
        ),
      ]),
    ],
  )
