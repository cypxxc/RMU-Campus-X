"use client"

// import { useChat } from "@ai-sdk/react"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { MessageCircle, X, Send, Sparkles, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import ReactMarkdown from "react-markdown"

export function HelpBotWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<any[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "สวัสดีครับ! พี่ชาร์คกี้ 🦈 ยินดีให้บริการครับ มีอะไรให้ช่วยเรื่องการแลกเปลี่ยนของใน RMU ไหมครับ?",
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = { 
      id: Date.now().toString(), 
      role: "user", 
      content: input 
    }
    
    // Add user message immediately
    setMessages(prev => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/chat/help", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMessage] }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.details || "Failed to send message")
      }

      // Initialize assistant message
      const assistantId = Date.now().toString() + "-ai"
      // Use "..." loading state initially
      setMessages(prev => [...prev, { id: assistantId, role: "assistant", content: "" }])

      // Parse JSON response
      const data = await response.json()
      
      // Update message with full text
      setMessages(prev => {
        const newMessages = [...prev]
        const lastMsg = newMessages[newMessages.length - 1]
        if (lastMsg.role === "assistant") {
          lastMsg.content = data.text
        }
        return newMessages
      })

    } catch (error) {
      console.error("Chat Error:", error)
      setMessages(prev => [...prev, { 
        id: "error-" + Date.now(), 
        role: "assistant", 
        content: `ขออภัยครับ เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : "Unknown error"}` 
      }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-100 flex flex-col items-end gap-2">
      {/* Toggle Button */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          size="lg"
          className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 bg-linear-to-r from-blue-600 to-cyan-500"
        >
          <MessageCircle className="h-8 w-8 text-white" />
          <span className="sr-only">เปิดแชทผู้ช่วย</span>
        </Button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <Card className="w-[400px] sm:w-[450px] h-[600px] shadow-2xl border-none flex flex-col animate-in slide-in-from-bottom-10 fade-in duration-300 overflow-hidden ring-1 ring-border/50">
          {/* Header */}
          <CardHeader className="p-4 bg-linear-to-r from-blue-600 to-cyan-500 text-white shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-white/20 p-1.5 rounded-lg backdrop-blur-sm">
                  <Sparkles className="h-5 w-5 text-yellow-300" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    Sharky Assistant 🦈
                  </CardTitle>
                  <p className="text-xs text-blue-100 flex items-center gap-1">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    Online 24/7
                  </p>
                </div>
              </div>
              <div className="flex gap-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </CardHeader>

          {/* Messages Area */}
          <CardContent className="flex-1 p-0 overflow-hidden bg-muted/30">
            <ScrollArea className="h-full p-4">
              <div className="space-y-4">
                {messages.map((m: any) => (
                  <div
                    key={m.id}
                    className={cn(
                      "flex gap-3 max-w-[85%]",
                      m.role === "user" ? "ml-auto justify-end" : "mr-auto"
                    )}
                  >
                    {m.role !== "user" && (
                      <Avatar className="h-8 w-8 mt-1 border bg-white">
                        {/* Use a clear icon as fallback if image fails */}
                        <AvatarFallback className="bg-blue-100 text-blue-600">🦈</AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={cn(
                        "p-3 rounded-2xl text-sm shadow-sm",
                        m.role === "user"
                          ? "bg-blue-600 text-white rounded-tr-none"
                          : "bg-white text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100 border rounded-tl-none"
                      )}
                    >
                      {m.content ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none wrap-break-word">
                          <ReactMarkdown
                            components={{
                              // Styles for markdown elements to override Tailwind reset
                              ul: ({node, ...props}) => <ul className="list-disc pl-4 space-y-1 my-1" {...props} />,
                              ol: ({node, ...props}) => <ol className="list-decimal pl-4 space-y-1 my-1" {...props} />,
                              li: ({node, ...props}) => <li className="pl-1" {...props} />,
                              p: ({node, ...props}) => <p className="mb-2 last:mb-0 leading-relaxed" {...props} />,
                              strong: ({node, ...props}) => <span className="font-bold font-heading" {...props} />,
                              h1: ({node, ...props}) => <h1 className="font-bold text-lg mb-2" {...props} />,
                              h2: ({node, ...props}) => <h2 className="font-bold text-base mb-2" {...props} />,
                              h3: ({node, ...props}) => <h3 className="font-bold text-sm mb-1" {...props} />,
                              a: ({node, ...props}) => <a className="underline hover:opacity-80 transition-opacity font-medium" target="_blank" rel="noopener noreferrer" {...props} />,
                              code: ({node, ...props}) => <code className="bg-black/10 dark:bg-white/10 rounded-sm px-1 py-0.5 font-mono text-xs" {...props} />,
                            }}
                          >
                            {m.content}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">...</span>
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-3 mr-auto max-w-[85%]">
                    <Avatar className="h-8 w-8 mt-1 border bg-white">
                        <AvatarFallback className="bg-blue-100 text-blue-600">🦈</AvatarFallback>
                    </Avatar>
                     <div className="bg-white dark:bg-zinc-800 border p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                        <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                        <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></span>
                     </div>
                  </div>
                )}
                <div ref={scrollRef} />
              </div>
            </ScrollArea>
          </CardContent>

          {/* Input Area */}
          <CardFooter className="p-3 bg-background border-t flex flex-col gap-2">
            <form onSubmit={handleSubmit} className="flex w-full gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="สอบถามวิธีการใช้งาน..."
                className="flex-1 focus-visible:ring-blue-500"
                disabled={isLoading}
              />
              <Button 
                type="submit" 
                size="icon" 
                disabled={isLoading || !input.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white shrink-0"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
            
            {/* Quick Suggestions */}
            {messages.length <= 1 && !isLoading && (
              <div className="flex flex-wrap gap-1.5 w-full">
                {[
                  "ระบบนี้ใช้งานยังไง?",
                  "วิธีโพสต์สิ่งของ",
                  "วิธีขอแลกเปลี่ยน",
                  "วิธีแชทกับคนอื่น",
                  "ติดต่อแอดมิน",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => {
                      setInput(suggestion)
                      // Auto submit after setting input
                      setTimeout(() => {
                        const userMessage = { 
                          id: Date.now().toString(), 
                          role: "user", 
                          content: suggestion 
                        }
                        setMessages(prev => [...prev, userMessage])
                        setIsLoading(true)
                        setInput("")
                        
                        fetch("/api/chat/help", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ messages: [...messages, userMessage] }),
                        })
                          .then(res => res.json())
                          .then(data => {
                            setMessages(prev => [...prev, { 
                              id: Date.now().toString() + "-ai", 
                              role: "assistant", 
                              content: data.text 
                            }])
                          })
                          .catch(() => {
                            setMessages(prev => [...prev, { 
                              id: "error-" + Date.now(), 
                              role: "assistant", 
                              content: "ขออภัยครับ เกิดข้อผิดพลาด" 
                            }])
                          })
                          .finally(() => setIsLoading(false))
                      }, 50)
                    }}
                    className="text-xs px-2.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800/50 transition-colors border border-blue-200 dark:border-blue-700"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </CardFooter>
        </Card>
      )}
    </div>
  )
}
