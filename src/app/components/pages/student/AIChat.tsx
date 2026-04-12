import { Card, CardContent } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/badge';
import { Avatar, AvatarFallback } from '../../ui/avatar';
import {
  Send, Sparkles, BookOpen, Clock, Target, TrendingUp, StopCircle,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

/* ── Types ── */
type MessageSender = 'ai' | 'user';
type Message = {
  id:           number;
  sender:       MessageSender;
  text:         string;
  time:         string;
  isStreaming?: boolean;
};

/* ── Helpers ── */
const now = () =>
  new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

/* ── Component ── */
export function AIChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id:     1,
      sender: 'ai',
      text:   "Hi! I'm your AI Study Assistant. I can help you with study plans, explain concepts, assist with assignments, and more. What would you like to learn today?",
      time:   now(),
    },
  ]);

  const [inputValue, setInputValue]   = useState('');
  const [isLoading, setIsLoading]     = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const abortControllerRef            = useRef<AbortController | null>(null);
  const messagesEndRef                = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const suggestedPrompts = [
    'Create a study plan',
    'Explain a concept',
    'Assignment tips',
    'Exam strategies',
  ];

  const studySuggestions = [
    { id: 1, title: 'React Hooks Best Practices',  description: 'Based on your current course',    type: 'Article',  icon: BookOpen,   color: 'bg-blue-100 text-blue-600' },
    { id: 2, title: 'Focus on Data Structures',    description: 'Recommended for upcoming exam',   type: 'Course',   icon: Target,     color: 'bg-purple-100 text-purple-600' },
    { id: 3, title: 'Practice Algorithms Daily',   description: 'Improve problem-solving skills',  type: 'Practice', icon: TrendingUp, color: 'bg-green-100 text-green-600' },
    { id: 4, title: 'Time Management Tips',        description: 'Optimize your study schedule',   type: 'Guide',    icon: Clock,      color: 'bg-orange-100 text-orange-600' },
  ];

  /* ── Stop streaming ── */
  const handleStop = () => {
    abortControllerRef.current?.abort();
    setIsLoading(false);
    setMessages((prev) =>
      prev.map((m) => (m.isStreaming ? { ...m, isStreaming: false } : m))
    );
  };

  /* ── Send message ── */
  const handleSendMessage = async (overrideText?: string) => {
    const text = (overrideText ?? inputValue).trim();
    if (!text || isLoading) return;

    setError(null);
    setInputValue('');

    const userMsg: Message = { id: Date.now(), sender: 'user', text, time: now() };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    const aiMsgId = Date.now() + 1;
    setMessages((prev) => [
      ...prev,
      { id: aiMsgId, sender: 'ai', text: '', time: now(), isStreaming: true },
    ]);

    // Build conversation history (exclude empty streaming placeholder)
    const conversationHistory = [...messages, userMsg]
      .filter((m) => !m.isStreaming && m.text)
      .map((m) => ({
        role:    m.sender === 'user' ? 'user' : ('assistant' as const),
        content: m.text,
      }));

    try {
      abortControllerRef.current = new AbortController();
      const token = localStorage.getItem('token');

      const response = await fetch(`${API_BASE_URL}/api/ai/chat`, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body:   JSON.stringify({ messages: conversationHistory }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        throw new Error(errData.error || `Request failed with status ${response.status}`);
      }

      const reader  = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder   = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);

            /* Anthropic streaming format */
            if (
              parsed.type === 'content_block_delta' &&
              parsed.delta?.type === 'text_delta'
            ) {
              accumulated += parsed.delta.text;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === aiMsgId ? { ...m, text: accumulated } : m
                )
              );
            }

            /* Gemini chunked format (we send same SSE shape from backend) */
            if (parsed.error) {
              throw new Error(parsed.error);
            }
          } catch (parseErr: any) {
            // Only re-throw actual errors, not JSON parse failures on partial chunks
            if (parseErr?.message && !parseErr.message.includes('JSON')) {
              throw parseErr;
            }
          }
        }
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMsgId ? { ...m, isStreaming: false } : m
        )
      );
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;

      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('AI Chat error:', msg);
      setError('Failed to get a response. Please try again.');

      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMsgId
            ? { ...m, text: "Sorry, I couldn't process your message. Please try again.", isStreaming: false }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  /* ── Render ── */
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Chat Panel ── */}
        <div className="lg:col-span-2">
          <Card className="border border-gray-200 h-[700px] flex flex-col">

            {/* Header */}
            <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-purple-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">AI Study Assistant</h3>
                  <p className="text-sm text-gray-500">Powered by AI · Always available</p>
                </div>
                <Badge className="ml-auto bg-green-500 text-white">Active</Badge>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex gap-3 max-w-[80%] ${message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarFallback
                        className={
                          message.sender === 'ai'
                            ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white'
                            : 'bg-indigo-100 text-indigo-600'
                        }
                      >
                        {message.sender === 'ai' ? <Sparkles className="w-4 h-4" /> : 'Me'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div
                        className={`rounded-2xl px-4 py-3 ${
                          message.sender === 'user'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        {message.text ? (
                          <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                        ) : (
                          <div className="flex gap-1 items-center h-5">
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
                          </div>
                        )}
                        {message.isStreaming && message.text && (
                          <span className="inline-block w-0.5 h-4 bg-gray-500 ml-0.5 animate-pulse" />
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-1 px-2">{message.time}</p>
                    </div>
                  </div>
                </div>
              ))}

              {error && (
                <div className="text-center text-sm text-red-500 bg-red-50 rounded-lg p-3">
                  {error}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Suggested Prompts */}
            <div className="px-6 pb-3">
              <div className="flex flex-wrap gap-2">
                {suggestedPrompts.map((prompt, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="rounded-full text-xs"
                    disabled={isLoading}
                    onClick={() => handleSendMessage(prompt)}
                  >
                    {prompt}
                  </Button>
                ))}
              </div>
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-100 bg-gray-50">
              <div className="flex items-center gap-3">
                <Input
                  type="text"
                  placeholder="Ask me anything about your studies..."
                  className="flex-1 bg-white border-gray-200"
                  value={inputValue}
                  disabled={isLoading}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                {isLoading ? (
                  <Button variant="destructive" className="gap-2 shrink-0" onClick={handleStop}>
                    <StopCircle className="w-4 h-4" />
                    Stop
                  </Button>
                ) : (
                  <Button
                    className="gap-2 shrink-0"
                    disabled={!inputValue.trim()}
                    onClick={() => handleSendMessage()}
                  >
                    <Send className="w-4 h-4" />
                    Send
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* ── Sidebar ── */}
        <div className="lg:col-span-1 space-y-4">

          {/* Quick Actions */}
          <Card className="border border-gray-200">
            <CardContent className="p-4">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Quick Actions
              </h3>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start text-sm"
                  disabled={isLoading}
                  onClick={() => handleSendMessage('Create a personalized weekly study plan for a computer science student')}
                >
                  <BookOpen className="w-4 h-4 mr-2 text-indigo-500" />
                  Generate Study Plan
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start text-sm"
                  disabled={isLoading}
                  onClick={() => handleSendMessage('Help me set SMART learning goals for this semester with specific milestones')}
                >
                  <Target className="w-4 h-4 mr-2 text-purple-500" />
                  Set Learning Goals
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start text-sm"
                  disabled={isLoading}
                  onClick={() => handleSendMessage('Give me tips on time management and how to track academic progress effectively')}
                >
                  <TrendingUp className="w-4 h-4 mr-2 text-green-500" />
                  Track Progress Tips
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start text-sm"
                  disabled={isLoading}
                  onClick={() => handleSendMessage('What are the best exam preparation strategies for technical subjects?')}
                >
                  <Clock className="w-4 h-4 mr-2 text-amber-500" />
                  Exam Prep Strategies
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* AI Suggestions */}
          <Card className="border border-gray-200">
            <CardContent className="p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Suggested Topics</h3>
              <div className="space-y-3">
                {studySuggestions.map((suggestion) => {
                  const Icon = suggestion.icon;
                  return (
                    <div
                      key={suggestion.id}
                      className="p-3 border border-gray-100 rounded-xl hover:border-indigo-200 hover:bg-indigo-50/50 cursor-pointer transition-all"
                      onClick={() => handleSendMessage(`Tell me about: ${suggestion.title}`)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-9 h-9 ${suggestion.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 mb-0.5">{suggestion.title}</p>
                          <p className="text-xs text-gray-500">{suggestion.description}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Chat Tips */}
          <Card className="border border-gray-200 bg-gradient-to-br from-indigo-50 to-purple-50">
            <CardContent className="p-4">
              <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                AI Tips
              </h3>
              <ul className="text-xs text-gray-600 space-y-1.5">
                <li>• Be specific — "explain React useEffect with examples" works better than "explain hooks"</li>
                <li>• Ask for step-by-step breakdowns of complex topics</li>
                <li>• Request practice questions or quizzes</li>
                <li>• Ask to summarize lecture notes or concepts</li>
              </ul>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}