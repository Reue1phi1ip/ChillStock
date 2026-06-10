"use client";

import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import StarterKit from "@tiptap/starter-kit";
import { EditorContent, useEditor } from "@tiptap/react";
import type { EmojiClickData } from "emoji-picker-react";
import {
  Bold,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  SmilePlus,
  Strikethrough,
  Underline as UnderlineIcon,
} from "lucide-react";
import dynamic from "next/dynamic";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false });

function ToolbarButton({
  active = false,
  children,
  className,
  onClick,
  title,
}: {
  active?: boolean;
  children: ReactNode;
  className?: string;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition hover:bg-white hover:text-slate-950",
        active ? "bg-white text-slate-950 shadow-[0_6px_18px_rgba(44,72,59,0.08)]" : undefined,
        className,
      )}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      title={title}
      type="button"
    >
      {children}
    </button>
  );
}

export function RichTextEditor({
  className,
  onChange,
  placeholder,
  value,
}: {
  className?: string;
  onChange: (payload: { html: string; text: string }) => void;
  placeholder?: string;
  value: string;
}) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement | null>(null);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        code: false,
        horizontalRule: false,
        blockquote: false,
      }),
      Underline,
      Link.configure({
        openOnClick: false,
      }),
      Placeholder.configure({
        placeholder: placeholder ?? "Write the update you want the guest to receive.",
      }),
    ],
    content: value || "<p></p>",
    editorProps: {
      attributes: {
        class:
          "tiptap-notification-editor min-h-[180px] px-4 py-3 text-sm leading-relaxed text-slate-800 outline-none [&_a]:break-words [&_em]:italic [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1 [&_p+p]:mt-2 [&_strong]:font-semibold [&_u]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1",
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      onChange({
        html: currentEditor.getHTML(),
        text: currentEditor.getText({ blockSeparator: "\n\n" }).trim(),
      });
    },
  });

  useEffect(() => {
    if (!editor) return;

    const currentHtml = editor.getHTML();
    const nextValue = value || "<p></p>";
    if (currentHtml === nextValue) return;

    editor.commands.setContent(nextValue, { emitUpdate: false });
  }, [editor, value]);

  useEffect(() => {
    if (!showEmojiPicker) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!emojiPickerRef.current?.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [showEmojiPicker]);

  const setLink = useCallback(() => {
    if (!editor) return;

    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("Enter URL", previousUrl || "https://");

    if (url === null) return;

    if (url.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  }, [editor]);

  const handleEmojiClick = useCallback(
    (emojiData: EmojiClickData) => {
      if (!editor) return;
      editor.chain().focus().insertContent(emojiData.emoji).run();
      setShowEmojiPicker(false);
    },
    [editor],
  );

  if (!editor) {
    return null;
  }

  return (
    <div
      className={cn(
        "relative overflow-visible rounded-[1.6rem] border border-[rgba(23,29,25,0.1)] bg-white/92 shadow-[0_16px_34px_rgba(44,72,59,0.08)]",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-0.5 border-b border-[rgba(23,29,25,0.08)] bg-[rgba(247,250,248,0.92)] px-2.5 py-2">
        <ToolbarButton
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold"
        >
          <Bold className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic"
        >
          <Italic className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="Underline"
        >
          <UnderlineIcon className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title="Strikethrough"
        >
          <Strikethrough className="h-3.5 w-3.5" />
        </ToolbarButton>

        <div className="mx-1 h-4 w-px bg-[rgba(23,29,25,0.08)]" />

        <ToolbarButton active={editor.isActive("link")} onClick={setLink} title="Link">
          <LinkIcon className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Bullet list"
        >
          <List className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Ordered list"
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolbarButton>

        <div className="mx-1 h-4 w-px bg-[rgba(23,29,25,0.08)]" />

        <ToolbarButton
          active={showEmojiPicker}
          onClick={() => setShowEmojiPicker((current) => !current)}
          title="Emoji"
        >
          <SmilePlus className="h-3.5 w-3.5" />
        </ToolbarButton>
      </div>

      {showEmojiPicker ? (
        <div
          className="absolute right-3 top-12 z-20 overflow-hidden rounded-2xl border border-[rgba(23,29,25,0.1)] bg-white shadow-[0_24px_54px_rgba(39,67,55,0.18)]"
          ref={emojiPickerRef}
        >
          <EmojiPicker height={360} onEmojiClick={handleEmojiClick} width={320} />
        </div>
      ) : null}

      <EditorContent className="max-h-[280px] overflow-y-auto" editor={editor} />
    </div>
  );
}
