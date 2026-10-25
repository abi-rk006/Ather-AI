import React, { createContext, useContext, useState, type ReactNode } from 'react';
import type { Message, ChatThread, AnsweringMode, SearchScope, ExamMarksFormat } from '../types';
import { INITIAL_MESSAGES, INITIAL_THREADS } from '../api/mockData';
import { apiClient } from '../api/client';
import { useApp } from './AppContext';

interface ChatContextType {
  threads: ChatThread[];
  currentThread: ChatThread;
  setCurrentThread: (thread: ChatThread) => void;
  messages: Message[];
  answeringMode: AnsweringMode;
  setAnsweringMode: (mode: AnsweringMode) => void;
  searchScope: SearchScope;
  setSearchScope: (scope: SearchScope) => void;
  examMarksFormat: ExamMarksFormat;
  setExamMarksFormat: (format: ExamMarksFormat) => void;
  isSending: boolean;
  sendMessage: (
    content: string,
    attachments?: { name: string; size: string; type: string }[]
  ) => Promise<void>;
  regenerateResponse: () => Promise<void>;
  forkThread: () => void;
  newChat: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { showError, setIsDocDrawerOpen, setSelectedCitation } = useApp();
  const [threads, setThreads] = useState<ChatThread[]>(INITIAL_THREADS);
  const [currentThread, setCurrentThread] = useState<ChatThread>(INITIAL_THREADS[0]);
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  
  // 3 LLM answering modes: 'exam' | 'explain' | 'retrieval'
  const [answeringMode, setAnsweringMode] = useState<AnsweringMode>('exam');
  
  // Search scopes: 'textbook_only' | 'textbook_and_materials' | 'materials_only'
  const [searchScope, setSearchScope] = useState<SearchScope>('textbook_and_materials');

  // Exam mode sub-toggle: 2-mark vs 13-mark format
  const [examMarksFormat, setExamMarksFormat] = useState<ExamMarksFormat>('13-mark');

  const [isSending, setIsSending] = useState(false);

  const sendMessage = async (
    content: string,
    attachments?: { name: string; size: string; type: string }[]
  ) => {
    if (!content.trim() && (!attachments || attachments.length === 0)) return;

    const userMsg: Message = {
      id: `msg-${Date.now()}-user`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      content,
      answeringMode,
      searchScope,
      examMarksFormat,
      attachments,
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsSending(true);

    const assistantMsgId = `msg-${Date.now()}-assistant`;
    const tempAssistantMsg: Message = {
      id: assistantMsgId,
      sender: 'assistant',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      content: '',
      answeringMode,
      searchScope,
      examMarksFormat,
      isStreaming: true,
      modelUsed: 'Nexus-Arch-v3.2',
    };

    setMessages((prev) => [...prev, tempAssistantMsg]);

    try {
      const result = await apiClient.sendMessage(
        content,
        answeringMode,
        searchScope,
        [...messages, userMsg],
        examMarksFormat,
        (chunk) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMsgId ? { ...msg, content: msg.content + chunk } : msg
            )
          );
        }
      );

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? {
                ...msg,
                content: result.response,
                citations: result.citations,
                tokens: result.telemetry.tokens,
                tokensPerSec: result.telemetry.tps,
                ttft: result.telemetry.ttft,
                isStreaming: false,
              }
            : msg
        )
      );

      // Auto open drawer if citations returned or in retrieval mode
      if (answeringMode === 'retrieval' || (result.citations && result.citations.length > 0)) {
        if (result.citations && result.citations.length > 0) {
          setSelectedCitation(result.citations[0]);
        }
      }
    } catch (err: any) {
      setMessages((prev) => prev.filter((m) => m.id !== assistantMsgId));
      showError('Inference Pipeline Error', 'Failed to retrieve context or generate completion.', err?.message);
    } finally {
      setIsSending(false);
    }
  };

  const regenerateResponse = async () => {
    const lastUserMsg = [...messages].reverse().find((m) => m.sender === 'user');
    if (lastUserMsg) {
      await sendMessage(lastUserMsg.content);
    }
  };

  const forkThread = () => {
    const newThreadId = `thread-${Date.now()}`;
    const newThread: ChatThread = {
      id: newThreadId,
      title: `${currentThread.title} (Fork)`,
      lastUpdated: 'Just now',
      messageCount: messages.length,
      category: currentThread.category,
    };
    setThreads([newThread, ...threads]);
    setCurrentThread(newThread);
  };

  const newChat = () => {
    const newThreadId = `thread-${Date.now()}`;
    const newThread: ChatThread = {
      id: newThreadId,
      title: 'New Architecture Exploration',
      lastUpdated: 'Just now',
      messageCount: 0,
      category: 'General',
    };
    setThreads([newThread, ...threads]);
    setCurrentThread(newThread);
    setMessages([]);
    setIsDocDrawerOpen(false);
    setSelectedCitation(null);
  };

  return (
    <ChatContext.Provider
      value={{
        threads,
        currentThread,
        setCurrentThread,
        messages,
        answeringMode,
        setAnsweringMode,
        searchScope,
        setSearchScope,
        examMarksFormat,
        setExamMarksFormat,
        isSending,
        sendMessage,
        regenerateResponse,
        forkThread,
        newChat,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) throw new Error('useChat must be used within a ChatProvider');
  return context;
};
