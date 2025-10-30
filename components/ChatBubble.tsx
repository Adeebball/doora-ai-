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
    ? 'bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 text-white shadow-lg shadow-orange-950/40 border border-orange-500/30'
    : 'bg-black/20 backdrop-blur-xl border border-white/10 text-gray-200 shadow-lg shadow-black/30';
  
  const containerClasses = isUser ? 'justify-end' : 'justify-start';
  const flexDirection = isUser ? 'flex-row-reverse' : 'flex-row';

  return (
    <div className={`flex ${containerClasses} gap-3 items-end message-enter`}>
      <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center ${isUser ? 'bg-gradient-to-br from-orange-500 to-orange-700 shadow-md' : 'bg-neutral-800 border border-white/10'}`}>
        {isUser ? <UserIcon className="w-6 h-6 text-white"/> : <BotIcon className="w-6 h-6 text-orange-400"/>}
      </div>
      <div className={`rounded-lg p-3 max-w-lg ${bubbleClasses}`}>
        {message.text && <p className="whitespace-pre-wrap">{message.text}</p>}
        {message.file && (
          <div className={`mt-2 p-2 rounded-md flex items-center gap-2 bg-white/10 backdrop-blur-sm`}>
            <PaperclipIcon className="w-4 h-4 text-gray-300 flex-shrink-0" />
            <span className="text-sm truncate">{message.file.name}</span>
          </div>
        )}
      </div>
    </div>
  );
};
