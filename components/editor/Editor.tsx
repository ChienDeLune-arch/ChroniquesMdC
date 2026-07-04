'use client'

import { useEditor, EditorContent, BubbleMenu, FloatingMenu } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Youtube from '@tiptap/extension-youtube'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import Highlight from '@tiptap/extension-highlight'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import Color from '@tiptap/extension-color'
import TextStyle from '@tiptap/extension-text-style'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import CharacterCount from '@tiptap/extension-character-count'
import { createLowlight } from 'lowlight'
import {
  Bold, Italic, Strikethrough, Code, Link2, Image as ImageIcon,
  List, ListOrdered, CheckSquare, Quote, Heading1, Heading2, Heading3,
  Table as TableIcon, Minus, AlignLeft, AlignCenter, AlignRight,
  Highlighter, Undo, Redo, Code2, Youtube as YoutubeIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useRef, useCallback } from 'react'

const lowlight = createLowlight()

interface EditorProps {
  content?: Record<string, unknown>
  onChange?: (content: Record<string, unknown>) => void
  placeholder?: string
  editable?: boolean
  className?: string
  showWordCount?: boolean
  maxWords?: number
}

export function Editor({
  content,
  onChange,
  placeholder = 'Commencez à écrire…',
  editable = true,
  className,
  showWordCount = false,
  maxWords,
}: EditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        heading: { levels: [1, 2, 3] },
      }),
      CodeBlockLowlight.configure({ lowlight }),
      Image.configure({ allowBase64: true, inline: false }),
      Youtube.configure({ controls: true, nocookie: true }),
      Link.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({ placeholder }),
      Highlight.configure({ multicolor: true }),
      Color,
      TextStyle,
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      CharacterCount.configure({ limit: maxWords ? maxWords * 6 : undefined }),
    ],
    content: content || '',
    editable,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getJSON() as Record<string, unknown>)
    },
  })

  const uploadImage = useCallback(async (file: File) => {
    if (!editor) return
    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const path = `editor/${Date.now()}.${ext}`

    const { data, error } = await supabase.storage
      .from('covers')
      .upload(path, file, { upsert: true })

    if (error || !data) return

    const { data: urlData } = supabase.storage.from('covers').getPublicUrl(path)
    editor.chain().focus().setImage({ src: urlData.publicUrl }).run()
  }, [editor])

  if (!editor) return null

  const wordCount = editor.storage.characterCount?.words() ?? 0

  return (
    <div className={cn('editor-wrapper flex flex-col border border-border rounded-xl overflow-hidden bg-surface-1', className)}>
      {editable && (
        <Toolbar editor={editor} onImageClick={() => fileInputRef.current?.click()} />
      )}

      {/* Bubble menu — sélection de texte */}
      {editable && (
        <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }}>
          <div className="flex items-center gap-0.5 bg-surface-0 border border-border rounded-lg shadow-lg p-1">
            <ToolbarBtn
              onClick={() => editor.chain().focus().toggleBold().run()}
              active={editor.isActive('bold')} title="Gras"
            ><Bold size={14} /></ToolbarBtn>
            <ToolbarBtn
              onClick={() => editor.chain().focus().toggleItalic().run()}
              active={editor.isActive('italic')} title="Italique"
            ><Italic size={14} /></ToolbarBtn>
            <ToolbarBtn
              onClick={() => editor.chain().focus().toggleStrike().run()}
              active={editor.isActive('strike')} title="Barré"
            ><Strikethrough size={14} /></ToolbarBtn>
            <ToolbarBtn
              onClick={() => editor.chain().focus().toggleHighlight().run()}
              active={editor.isActive('highlight')} title="Surligner"
            ><Highlighter size={14} /></ToolbarBtn>
            <div className="w-px h-4 bg-border mx-0.5" />
            <ToolbarBtn
              onClick={() => {
                const url = window.prompt('URL du lien')
                if (url) editor.chain().focus().setLink({ href: url }).run()
              }}
              active={editor.isActive('link')} title="Lien"
            ><Link2 size={14} /></ToolbarBtn>
          </div>
        </BubbleMenu>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) uploadImage(file)
          e.target.value = ''
        }}
      />

      <EditorContent
        editor={editor}
        className={cn(
          'prose prose-base max-w-none p-5 focus-within:outline-none min-h-[300px]',
          'prose-headings:font-medium prose-a:text-accent prose-code:bg-surface-0',
          !editable && 'pointer-events-none'
        )}
      />

      {showWordCount && (
        <div className="flex justify-end px-5 py-2 border-t border-border text-xs text-muted">
          {wordCount} mot{wordCount !== 1 ? 's' : ''}
          {maxWords && ` / ${maxWords}`}
        </div>
      )}
    </div>
  )
}

// ---- Toolbar ----
function Toolbar({
  editor,
  onImageClick,
}: {
  editor: ReturnType<typeof useEditor>
  onImageClick: () => void
}) {
  if (!editor) return null

  return (
    <div className="flex flex-wrap items-center gap-0.5 p-2 border-b border-border bg-surface-0">
      {/* Headings */}
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        active={editor.isActive('heading', { level: 1 })} title="Titre 1"
      ><Heading1 size={16} /></ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive('heading', { level: 2 })} title="Titre 2"
      ><Heading2 size={16} /></ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        active={editor.isActive('heading', { level: 3 })} title="Titre 3"
      ><Heading3 size={16} /></ToolbarBtn>

      <Divider />

      {/* Format */}
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive('bold')} title="Gras"
      ><Bold size={16} /></ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive('italic')} title="Italique"
      ><Italic size={16} /></ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={editor.isActive('strike')} title="Barré"
      ><Strikethrough size={16} /></ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        active={editor.isActive('highlight')} title="Surligner"
      ><Highlighter size={16} /></ToolbarBtn>

      <Divider />

      {/* Listes */}
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive('bulletList')} title="Liste"
      ><List size={16} /></ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive('orderedList')} title="Liste numérotée"
      ><ListOrdered size={16} /></ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        active={editor.isActive('taskList')} title="Liste de tâches"
      ><CheckSquare size={16} /></ToolbarBtn>

      <Divider />

      {/* Blocs */}
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        active={editor.isActive('blockquote')} title="Citation"
      ><Quote size={16} /></ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleCode().run()}
        active={editor.isActive('code')} title="Code inline"
      ><Code size={16} /></ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        active={editor.isActive('codeBlock')} title="Bloc de code"
      ><Code2 size={16} /></ToolbarBtn>

      <Divider />

      {/* Insertion */}
      <ToolbarBtn onClick={onImageClick} title="Insérer une image">
        <ImageIcon size={16} />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => {
          const url = window.prompt('URL YouTube ou Vimeo')
          if (url) editor.chain().focus().setYoutubeVideo({ src: url }).run()
        }}
        title="Vidéo YouTube"
      >
        <YoutubeIcon size={16} />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => {
          const url = window.prompt('URL du lien')
          if (url) editor.chain().focus().setLink({ href: url }).run()
        }}
        active={editor.isActive('link')} title="Lien"
      ><Link2 size={16} /></ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus()
          .insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
        title="Tableau"
      ><TableIcon size={16} /></ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="Séparateur"
      ><Minus size={16} /></ToolbarBtn>

      <Divider />

      {/* Undo / Redo */}
      <ToolbarBtn
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()} title="Annuler"
      ><Undo size={16} /></ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()} title="Rétablir"
      ><Redo size={16} /></ToolbarBtn>
    </div>
  )
}

function ToolbarBtn({
  children,
  onClick,
  active = false,
  disabled = false,
  title,
}: {
  children: React.ReactNode
  onClick?: () => void
  active?: boolean
  disabled?: boolean
  title?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'p-1.5 rounded-md transition-colors',
        active
          ? 'bg-accent/15 text-accent'
          : 'text-secondary hover:bg-surface-1 hover:text-primary',
        disabled && 'opacity-30 cursor-not-allowed'
      )}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <div className="w-px h-4 bg-border mx-0.5" />
}

// ---- Viewer readonly ----
export function EditorViewer({
  content,
  className,
}: {
  content: Record<string, unknown>
  className?: string
}) {
  return (
    <Editor
      content={content}
      editable={false}
      className={cn('border-none rounded-none bg-transparent', className)}
    />
  )
}
