"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { MessageSquare, X, Send, Minimize2, Maximize2, Bot, User, Sparkles } from "lucide-react"

export interface Message {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  timestamp: Date
  actions?: MessageAction[]
}

export interface MessageAction {
  label: string
  action: () => void
  variant?: "default" | "outline" | "ghost"
}

interface ChatPanelProps {
  messages: Message[]
  onSendMessage: (message: string) => void
  isProcessing?: boolean
  placeholder?: string
}

export function ChatPanel({
  messages,
  onSendMessage,
  isProcessing = false,
  placeholder = "Ask AI to optimize your slides...",
}: ChatPanelProps) {
  const [input, setInput] = useState("")
  const [isMinimized, setIsMinimized] = useState(false)
  const [isOpen, setIsOpen] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = () => {
    if (input.trim() && !isProcessing) {
      onSendMessage(input.trim())
      setInput("")
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 bg-primary text-primary-foreground p-4 rounded-full shadow-lg hover:scale-105 transition-transform"
        title="Open AI Assistant"
      >
        <MessageSquare className="h-6 w-6" />
      </button>
    )
  }

  return (
    <Card
      className={`fixed bottom-6 right-6 z-50 w-96 shadow-xl border-2 flex flex-col transition-all duration-300 ${
        isMinimized ? "h-14" : "h-[500px]"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 p-1.5 rounded-lg">
            <Bot className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">AI Assistant</h3>
            <p className="text-xs text-muted-foreground">
              {isProcessing ? "Thinking..." : "Ready to help"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            {isMinimized ? (
              <Maximize2 className="h-3.5 w-3.5" />
            ) : (
              <Minimize2 className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                <Sparkles className="h-12 w-12 mb-3 text-primary/30" />
                <p className="text-sm font-medium">Ask me anything about your slides!</p>
                <p className="text-xs mt-2 opacity-70">
                  "Optimize the layout"<br />
                  "Generate an image for slide 3"<br />
                  "Make the design more colorful"
                </p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    {message.role === "user" ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                  </div>
                  <div
                    className={`flex-1 space-y-2 ${
                      message.role === "user" ? "items-end" : "items-start"
                    } flex flex-col`}
                  >
                    <div
                      className={`rounded-lg px-3 py-2 max-w-[100%] text-sm ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <div
                        className={`prose prose-sm max-w-none ${
                          message.role === "user"
                            ? "text-primary-foreground prose-invert"
                            : "text-foreground dark:prose-invert"
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{message.content}</p>
                      </div>
                      {message.actions && message.actions.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {message.actions.map((action, idx) => (
                            <Button
                              key={idx}
                              size="sm"
                              variant={action.variant || "outline"}
                              className="h-8 text-xs"
                              onClick={action.action}
                            >
                              {action.label}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {message.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              ))
            )}
            {isProcessing && (
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary animate-pulse" />
                </div>
                <div className="bg-muted rounded-lg px-3 py-2">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" />
                    <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce delay-100" />
                    <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce delay-200" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t bg-muted/30">
            <div className="flex gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={isProcessing}
                className="flex-1 resize-none rounded-md border border-input bg-white text-slate-900 placeholder:text-slate-500 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-400 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 min-h-[60px] max-h-[120px]"
              />
              <Button
                size="icon"
                onClick={handleSend}
                disabled={!input.trim() || isProcessing}
                className="h-10 w-10 flex-shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </>
      )}
    </Card>
  )
}
