
import React from 'react';
import { Message, Sender } from '../types';
import { BotIcon } from './icons/BotIcon';
import { UserIcon } from './icons/UserIcon';
import { PaperclipIcon } from './icons/PaperclipIcon';

interface ChatBubbleProps {
  message: Message;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  const isUser = message.sender === Sender.USER;

  const bubbleClasses = isUser
    ? 'bg-purple-600 text-white'
    : 'bg-gray-700 text-gray-200';
  
  const containerClasses = isUser ? 'justify-end' : 'justify-start';
  const flexDirection = isUser ? 'flex-row-reverse' : 'flex-row';

  return (
    <div className={`flex ${containerClasses} gap-3 items-end`}>
      <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center ${isUser ? 'bg-purple-600' : 'bg-gray-700'}`}>
        {isUser ? <UserIcon className="w-6 h-6 text-white"/> : <BotIcon className="w-6 h-6 text-purple-400"/>}
      </div>
      <div className={`rounded-lg p-3 max-w-lg ${bubbleClasses} shadow-md`}>
        {message.text && <p className="whitespace-pre-wrap">{message.text}</p>}
        {message.file && (
          <div className={`mt-2 p-2 rounded-md flex items-center gap-2 ${isUser ? 'bg-purple-700/80' : 'bg-gray-800/80'}`}>
            <PaperclipIcon className="w-4 h-4 text-gray-300 flex-shrink-0" />
            <span className="text-sm truncate">{message.file.name}</span>
          </div>
        )}
      </div>
    </div>
  );
};
