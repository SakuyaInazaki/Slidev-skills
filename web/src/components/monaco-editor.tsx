"use client"

import { useEffect, useRef } from "react"
import Editor, { OnMount } from "@monaco-editor/react"
import * as monaco from "monaco-editor"

interface MonacoEditorProps {
  value: string
  onChange?: (value: string) => void
  language?: string
  readOnly?: boolean
  className?: string
}

export default function MonacoEditor({
  value,
  onChange,
  language = "markdown",
  readOnly = false,
  className = "",
}: MonacoEditorProps) {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor

    // Configure theme
    monaco.editor.defineTheme("slidev-theme", {
      base: "vs",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": "#ffffff",
      },
    })

    // Try to detect system dark mode
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      monaco.editor.setTheme("vs-dark")
    }

    // Listen for theme changes
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
      monaco.editor.setTheme(e.matches ? "vs-dark" : "vs")
    })
  }

  return (
    <div className={`h-full ${className}`}>
      <Editor
        height="100%"
        language={language}
        value={value}
        onChange={(value) => onChange?.(value || "")}
        onMount={handleEditorDidMount}
        options={{
          readOnly,
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          wordWrap: "on",
          automaticLayout: true,
          padding: { top: 16, bottom: 16 },
          tabSize: 2,
          theme: "vs",
        }}
        theme="vs"
      />
    </div>
  )
}
