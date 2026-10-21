import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'
import { UrlRequest } from 'foldkit/navigation'
import { Url } from 'foldkit/url'

export const Message = defineMessageUnion({
  ClickedLink: { request: UrlRequest },
  ChangedUrl: { url: Url },
  CompletedNavigateInternal: {},
  CompletedLoadExternal: {},
  ClickedCopyCode: { codeId: Schema.String, text: Schema.String },
  SucceededCopyCode: { codeId: Schema.String },
  FailedCopyCode: {},
  CompletedWaitBeforeHidingCopied: { codeId: Schema.String },
})
export type Message = typeof Message.Type
