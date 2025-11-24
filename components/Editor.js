'use client';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import {
    Bold,
    Italic,
    Underline as UnderlineIcon,
    List,
    ListOrdered,
    Heading1,
    Heading2,
    Quote,
    Maximize,
    Minimize,
    Type,
    Code
} from 'lucide-react';
import { useState, useEffect } from 'react';

const ToolbarButton = ({ onClick, isActive, disabled, children, title }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        title={title}
        className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition ${
            isActive ? 'bg-gray-200 dark:bg-gray-700 text-orange-600 dark:text-orange-400' : 'text-gray-600 dark:text-gray-300'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
        {children}
    </button>
);

const Separator = () => <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />;

export default function Editor({ initialContent, onChange, placeholder = 'Start writing...' }) {
    const [isFullscreen, setIsFullscreen] = useState(false);

    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit,
            Underline,
            Placeholder.configure({
                placeholder: placeholder,
            }),
        ],
        content: initialContent,
        editorProps: {
            attributes: {
                class: 'prose dark:prose-invert max-w-none focus:outline-none min-h-[300px] p-4',
            },
        },
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
    });

    // Handle initial content updates if they change externally (e.g. loading from local storage late)
    useEffect(() => {
        if (editor && initialContent && editor.getHTML() !== initialContent) {
            // Only set content if it's significantly different to avoid cursor jumps
            // Ideally, we only set initialContent once.
            // For this app, initialContent comes from a parent state that might be empty first.
             if (editor.getText() === '' && initialContent) {
                 editor.commands.setContent(initialContent);
             }
        }
    }, [initialContent, editor]);


    if (!editor) {
        return null;
    }

    const toggleFullscreen = () => {
        setIsFullscreen(!isFullscreen);
    };

    const containerClass = isFullscreen
        ? 'fixed inset-0 z-50 bg-white dark:bg-gray-900 flex flex-col p-4 md:p-8 overflow-hidden'
        : 'bg-white dark:bg-gray-800 rounded-md border border-orange-200 dark:border-gray-600 shadow-sm flex flex-col overflow-hidden';

    return (
        <div className={containerClass}>
            {/* Toolbar */}
            <div className={`flex flex-wrap items-center gap-1 p-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 ${isFullscreen ? 'justify-center' : ''}`}>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    isActive={editor.isActive('bold')}
                    title="Bold"
                >
                    <Bold size={18} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    isActive={editor.isActive('italic')}
                    title="Italic"
                >
                    <Italic size={18} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    isActive={editor.isActive('underline')}
                    title="Underline"
                >
                    <UnderlineIcon size={18} />
                </ToolbarButton>

                <Separator />

                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    isActive={editor.isActive('heading', { level: 1 })}
                    title="Heading 1"
                >
                    <Heading1 size={18} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    isActive={editor.isActive('heading', { level: 2 })}
                    title="Heading 2"
                >
                    <Heading2 size={18} />
                </ToolbarButton>
                 <ToolbarButton
                    onClick={() => editor.chain().focus().setParagraph().run()}
                    isActive={editor.isActive('paragraph')}
                    title="Normal Text"
                >
                    <Type size={18} />
                </ToolbarButton>

                <Separator />

                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    isActive={editor.isActive('bulletList')}
                    title="Bullet List"
                >
                    <List size={18} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    isActive={editor.isActive('orderedList')}
                    title="Ordered List"
                >
                    <ListOrdered size={18} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    isActive={editor.isActive('blockquote')}
                    title="Quote"
                >
                    <Quote size={18} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                    isActive={editor.isActive('codeBlock')}
                    title="Code Block"
                >
                    <Code size={18} />
                </ToolbarButton>

                <div className="flex-grow" />

                <ToolbarButton
                    onClick={toggleFullscreen}
                    isActive={isFullscreen}
                    title={isFullscreen ? "Exit Distraction Free" : "Distraction Free Mode"}
                >
                    {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                </ToolbarButton>
            </div>

            {/* Editor Area */}
            <div className={`flex-grow overflow-y-auto ${isFullscreen ? 'max-w-3xl mx-auto w-full mt-8' : ''}`}>
                 <EditorContent editor={editor} className="h-full" />
            </div>
        </div>
    );
}
