
import React, { useState, useEffect, useRef } from 'react';
import { Message, Sender } from './types';
import { ChatBubble } from './components/ChatBubble';
import { ChatInput } from './components/ChatInput';
import { generateResponse } from './services/geminiService';
import { BotIcon } from './components/icons/BotIcon';

const fileToGenerativePart = async (file: File) => {
  const base64EncodedData = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: {
      data: base64EncodedData,
      mimeType: file.type,
    },
  };
};

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'initial-message',
      sender: Sender.AI,
      text: 'أهلاً بك في Doora AI! أنا هنا لمساعدتك في كل ما يتعلق بالتسويق الرقمي وصناعة المحتوى. كيف يمكنني خدمتك اليوم؟',
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (inputText: string, file: File | null) => {
    if (!inputText.trim() && !file) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      sender: Sender.USER,
      text: inputText,
      file: file ? { name: file.name, type: file.type } : undefined,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const filePart = file ? await fileToGenerativePart(file) : null;
      const aiResponseText = await generateResponse(inputText, filePart);

      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        sender: Sender.AI,
        text: aiResponseText,
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error generating response:', error);
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        sender: Sender.AI,
        text: 'عفواً، حدث خطأ أثناء محاولة معالجة طلبك. يرجى المحاولة مرة أخرى.',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-100 font-sans">
       <header className="bg-gray-800/50 backdrop-blur-sm p-4 border-b border-gray-700 flex items-center justify-center gap-3 shadow-lg">
          <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
            <BotIcon className="w-6 h-6 text-white"/>
          </div>
          <h1 className="text-2xl font-bold tracking-wider">Doora AI</h1>
        </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} />
        ))}
        {isLoading && (
          <div className="flex justify-start gap-3 items-end">
            <div className="w-10 h-10 bg-gray-700 rounded-full flex-shrink-0 flex items-center justify-center">
              <BotIcon className="w-6 h-6 text-purple-400" />
            </div>
            <div className="bg-gray-700 rounded-lg p-3 max-w-lg">
                <div className="flex items-center justify-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse [animation-delay:-0.3s]"></div>
                    <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse [animation-delay:-0.15s]"></div>
                    <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></div>
                </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </main>

      <footer className="bg-gray-900/70 backdrop-blur-sm p-2 md:p-4 border-t border-gray-700">
        <ChatInput onSend={handleSendMessage} isLoading={isLoading} />
      </footer>
    </div>
  );
};

export default App;
