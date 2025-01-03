"use client"

import { useState, useEffect, useRef, useCallback } from "react"

import TextEditor from "../atoms/Editor"
import { useAuth } from "@/src/contexts/AuthContext"
import useEditorHook from "@/src/hooks/useEditor.hook"
import { Meet } from "@/src/lib/@types/Items/Meet"
import { Link as LinkIcon } from "@/src/lib/icons/Link"
import { useMeetsStore } from "@/src/lib/store/meets.store"
import { formatMeetDate, formatMeetTime } from "@/src/utils/datetime"

interface EditedItem {
  title: string
}

interface TimeoutRefs {
  title: ReturnType<typeof setTimeout> | null
  editor: ReturnType<typeof setTimeout> | null
}

const SAVE_DELAY = {
  TITLE: 500,
  CONTENT: 500,
} as const

export const MeetNotes = ({ meetData }): JSX.Element => {
  // Hooks must be called unconditionally
  const { session } = useAuth()
  const { updateMeet } = useMeetsStore()

  // Refs
  const textareaRefTitle = useRef<HTMLTextAreaElement>(null)
  const divRef = useRef<HTMLDivElement>(null)
  const timeoutRefs = useRef<TimeoutRefs>({
    title: null,
    editor: null,
  })
  const lastSavedContent = useRef(meetData?.description || "<p></p>")

  // State
  const [editItemId, setEditItemId] = useState<string | null>(null)
  const [editedItem, setEditedItem] = useState<EditedItem>({ title: "" })
  const [content, setContent] = useState(meetData?.description || "<p></p>")
  const [isSaved, setIsSaved] = useState(true)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Memoized handlers
  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent)
    const hasChanged = newContent !== lastSavedContent.current
    setHasUnsavedChanges(hasChanged)
    setIsSaved(!hasChanged)
  }, [])

  const handleSaveEditedItem = useCallback(
    async (item: Meet) => {
      if (!item?._id || !editItemId) return

      try {
        await updateMeet(
          session,
          {
            ...item,
            title: editedItem.title,
          },
          item.id
        )
      } catch (error) {
        console.error("Error updating item:", error)
      }
    },
    [session, updateMeet, editItemId, editedItem.title]
  )

  // Editor setup
  const editor = useEditorHook({
    content,
    setContent: handleContentChange,
    setIsSaved,
  })

  // Handle editor content updates with debounce
  const saveContent = useCallback(() => {
    if (!meetData?._id || content === lastSavedContent.current) return

    updateMeet(session, { ...meetData, description: content }, meetData.id)
    lastSavedContent.current = content
    setHasUnsavedChanges(false)
    setIsSaved(true)
  }, [content, meetData, session, updateMeet])

  // Effect to handle content auto-save
  useEffect(() => {
    if (!hasUnsavedChanges) return

    if (timeoutRefs.current.editor) {
      clearTimeout(timeoutRefs.current.editor)
    }

    timeoutRefs.current.editor = setTimeout(saveContent, SAVE_DELAY.CONTENT)

    return () => {
      if (timeoutRefs.current.editor) {
        clearTimeout(timeoutRefs.current.editor)
      }
    }
  }, [hasUnsavedChanges, saveContent])

  // Effect to initialize editor when currentItem changes
  useEffect(() => {
    if (!meetData) return

    const newContent = meetData.description || "<p></p>"

    if (meetData._id !== editItemId) {
      setEditItemId(meetData._id)
      setEditedItem({ title: meetData.title || "" })
      setContent(newContent)
      lastSavedContent.current = newContent

      if (editor?.commands) {
        editor.commands.setContent(newContent)
        editor.commands.focus()
      }
    }
  }, [meetData, editItemId, editor])

  // Effect to handle title auto-save
  useEffect(() => {
    if (!meetData || editedItem.title === meetData.title) return

    if (timeoutRefs.current.title) {
      clearTimeout(timeoutRefs.current.title)
    }

    timeoutRefs.current.title = setTimeout(() => {
      handleSaveEditedItem(meetData)
    }, SAVE_DELAY.TITLE)

    return () => {
      if (timeoutRefs.current.title) {
        clearTimeout(timeoutRefs.current.title)
      }
    }
  }, [editedItem.title, meetData, handleSaveEditedItem])

  // Effect to handle textarea auto-resize
  useEffect(() => {
    const textarea = textareaRefTitle.current
    if (textarea) {
      textarea.style.height = "auto"
      textarea.style.height = `${textarea.scrollHeight}px`
    }
  }, [editedItem.title])

  // Memoized handler for textarea keydown
  const handleTextareaKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key !== "Enter") return

      e.preventDefault()

      if (e.shiftKey) {
        const textarea = e.currentTarget
        const cursorPosition = textarea.selectionStart
        const newValue =
          editedItem.title.slice(0, cursorPosition) +
          "\n" +
          editedItem.title.slice(cursorPosition)

        setEditedItem((prev) => ({ ...prev, title: newValue }))

        requestAnimationFrame(() => {
          textarea.selectionStart = cursorPosition + 1
          textarea.selectionEnd = cursorPosition + 1
        })
      } else if (editor) {
        editor.commands.focus()
        editor.commands.setTextSelection(0)
      }
    },
    [editedItem.title, editor]
  )

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setEditedItem((prev) => ({
        ...prev,
        title: e.target.value,
      }))
    },
    []
  )

  if (!meetData) {
    return <div>No meeting data available</div>
  }

  return (
    <>
      <div className="flex items-center gap-1 text-sm">
        <div className="mr-4 size-4 rounded-sm bg-[#E34136]/80"></div>
        <p>
          {meetData?.metadata?.start?.dateTime
            ? formatMeetDate(new Date(meetData.metadata.start.dateTime))
            : "Date not available"}
        </p>
        <p>.</p>
        <p>
          {meetData?.metadata?.start?.dateTime &&
          meetData?.metadata?.end?.dateTime
            ? `${formatMeetTime(new Date(meetData.metadata.start.dateTime))} - ${formatMeetTime(new Date(meetData.metadata.end.dateTime))}`
            : "Time not available"}
        </p>
        {meetData?.metadata?.hangoutLink && (
          <a
            href={meetData.metadata.hangoutLink}
            target="_blank"
            className="flex items-center gap-3 rounded-md px-4 text-secondary-foreground"
          >
            <span>
              <LinkIcon />
            </span>
            {meetData.metadata.hangoutLink}
          </a>
        )}
      </div>
      <div>
        <textarea
          ref={textareaRefTitle}
          value={editedItem.title}
          onChange={handleTitleChange}
          onKeyDown={handleTextareaKeyDown}
          placeholder="Untitled"
          className="w-full resize-none overflow-hidden truncate whitespace-pre-wrap break-words bg-background py-6 text-[21px] font-bold text-foreground outline-none placeholder:text-secondary-foreground focus:outline-none"
          rows={1}
        />
        <div className="text-foreground">
          <TextEditor editor={editor} />
        </div>
      </div>
    </>
  )
}
