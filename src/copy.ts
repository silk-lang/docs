import { HashSet } from 'effect'

import { type CopyButton } from './code'
import { Message } from './message'

export type CopiedCodeIds = HashSet.HashSet<string>

export const copyButtonFor = (
  copiedCodeIds: CopiedCodeIds,
  codeId: string,
  text: string,
): CopyButton<Message> => ({
  isCopied: HashSet.has(copiedCodeIds, codeId),
  onCopy: Message.ClickedCopyCode({ codeId, text }),
})
