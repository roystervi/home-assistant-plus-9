"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mic, Send, Volume2, StopCircle } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/lib/auth-client";

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

export default function JarvisAssistant() {
  const [tracks, setTracks] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const { data: session, isPending: sessionLoading } = useSession();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  if (sessionLoading) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-4">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!session?.user) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-4">
          <div className="text-center py-8">
            <h3 className="text-lg font-semibold mb-2">JARVIS Assistant</h3>
            <p className="text-muted-foreground mb-4">Please log in to use the assistant.</p>
            <Button onClick={() => window.location.href = "/login"}>Log In</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const addMessage = (content: string, isUser: boolean) => {
    const message: Message = {
      id: Date.now().toString(),
      content,
      isUser,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, message]);
  };

  const speak = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1.1;
    utterance.volume = 1;
    utterance.lang = "en-US";
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    speechSynthesis.speak(utterance);
  };

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    addMessage(text, true);
    setInput("");
    setIsLoading(true);

    // Fetch relevant data for context
    let context = "";
    const lowerText = text.toLowerCase();

    try {
      if (lowerText.includes("energy") || lowerText.includes("bill") || lowerText.includes("usage")) {
        const response = await fetch("/api/energy/bills?limit=3");
        if (response.ok) {
          const bills = await response.json();
          context = `Recent energy bills: ${bills.map(b => `${b.billingMonth}: $${b.totalBillAmount.toFixed(2)}`).join(", ")}. `;
        }
      }

      if (lowerText.includes("home") || lowerText.includes("light") || lowerText.includes("thermostat") || lowerText.includes("device")) {
        const response = await fetch("/api/homeassistant/entities?search=all");
        if (response.ok) {
          const entities = await response.json();
          context += `Available home devices: ${entities.slice(0, 5).map(e => e.entity_id).join(", ")}. `;
        }
      }

      // Additional fetches can be added here for other APIs
    } catch (fetchError) {
      console.error("Error fetching context:", fetchError);
      context = "Could not fetch real-time data. ";
    }

    try {
      const response = await fetch("/api/llm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: `You are JARVIS, a helpful AI assistant for home management. Use this context if relevant: ${context}Provide concise, helpful responses about energy usage, home automation (e.g., control lights via /api/homeassistant/entities, check thermostat), and general queries. If action needed, suggest how user can trigger it. Keep responses under 150 words.`,
            },
            { role: "user", content: text },
          ],
          max_tokens: 150,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error("LLM request failed");
      }

      const data = await response.json();
      const aiResponse = data.choices[0].message.content || "Sorry, I couldn't process that.";

      // Speak using native TTS
      speak(aiResponse);
      addMessage(aiResponse, false);
    } catch (error) {
      console.error("Error:", error);
      addMessage("Sorry, I'm having trouble responding right now. Please try again.", false);
    } finally {
      setIsLoading(false);
    }
  };

  const startListening = async () => {
    // Always use native speech recognition for now
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      toast.error("Speech recognition not supported in this browser.");
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      toast.success("Listening...");
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      sendMessage(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
      toast.error(`Speech recognition error: ${event.error}`);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
    recognitionRef.current = recognition as SpeechRecognition;
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <span className="text-primary-foreground text-sm font-bold">J</span>
          </div>
          JARVIS Assistant
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-96 flex flex-col">
          <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                Hello, I'm JARVIS. How can I help with your home or energy queries?
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className={`mb-4 ${msg.isUser ? "text-right" : "text-left"}`}>
                  <div
                    className={`inline-block p-3 rounded-lg max-w-xs lg:max-w-md ${
                      msg.isUser
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    <p>{msg.content}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {msg.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="text-left mb-4">
                <div className="inline-block p-3 rounded-lg bg-muted text-foreground max-w-xs lg:max-w-md">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    <p>JARVIS is thinking...</p>
                  </div>
                </div>
              </div>
            )}
            {isSpeaking && (
              <div className="text-left mb-4">
                <div className="inline-block px-3 py-1 rounded-full bg-accent text-accent-foreground text-xs">
                  <Volume2 className="w-3 h-3 mr-1 inline" /> Speaking
                </div>
              </div>
            )}
          </ScrollArea>
          <div className="p-4 border-t bg-background">
            <div className="flex gap-2">
              <Button
                type="button"
                size="icon"
                variant={isListening ? "destructive" : "outline"}
                onClick={isListening ? stopListening : startListening}
                disabled={isLoading || isSpeaking}
                title={isListening ? "Stop listening" : "Start voice input"}
              >
                {isListening ? <StopCircle className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && !isLoading) {
                    sendMessage(input);
                  }
                }}
                placeholder="Type your message or use voice..."
                disabled={isLoading || isSpeaking}
              />
              <Button
                type="button"
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isLoading || isSpeaking}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}