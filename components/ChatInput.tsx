import React, { useState, useRef } from 'react';
import { SendIcon } from './icons/SendIcon';
import { PaperclipIcon } from './icons/PaperclipIcon';
import { MicrophoneIcon } from './icons/MicrophoneIcon';

interface ChatInputProps {
  onSend: (text: string, file: File | null) => void;
  isLoading: boolean;
  onLiveChatToggle: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, isLoading, onLiveChatToggle }) => {
  const [inputText, setInputText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || (!inputText.trim() && !file)) return;
    onSend(inputText, file);
    setInputText('');
    setFile(null);
    if(fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const removeFile = () => {
    setFile(null);
    if(fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  return (
    <div className="px-4">
        {file && (
            <div className="bg-black/20 backdrop-blur-xl border border-white/10 mb-2 p-2 rounded-lg flex justify-between items-center text-sm shadow-md">
                <div className="flex items-center gap-2 truncate">
                    <PaperclipIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="truncate">{file.name}</span>
                </div>
                <button onClick={removeFile} className="text-gray-400 hover:text-white transition-colors text-xl font-bold">&times;</button>
            </div>
        )}
        <form onSubmit={handleSend} className="flex items-center gap-2 md:gap-4 bg-black/20 backdrop-blur-xl border border-white/10 rounded-full p-2 shadow-inner shadow-black/50">
            <label htmlFor="file-upload" className="p-2 rounded-full hover:bg-white/10 cursor-pointer transition-colors">
                <PaperclipIcon className="w-6 h-6 text-gray-400" />
            </label>
            <input
                id="file-upload"
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
            />
            <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="اسأل Doora AI..."
                className="flex-1 bg-transparent focus:outline-none text-gray-100 placeholder-neutral-400 px-2"
                disabled={isLoading}
            />
             <button
                type="button"
                onClick={onLiveChatToggle}
                disabled={isLoading}
                className="p-3 text-white disabled:text-gray-600 disabled:cursor-not-allowed hover:bg-white/10 rounded-full transition-colors focus:outline-none"
                aria-label="Start voice chat"
            >
              <MicrophoneIcon className="w-6 h-6" />
            </button>
            <button
                type="submit"
                disabled={isLoading || (!inputText.trim() && !file)}
                className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-full p-3 text-white disabled:bg-neutral-700/50 disabled:from-transparent disabled:text-neutral-500 disabled:cursor-not-allowed hover:brightness-125 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black/50 focus:ring-orange-400 shadow-md hover:shadow-lg shadow-orange-950/50"
            >
                <SendIcon className="w-6 h-6" />
            </button>
        </form>
    </div>
  );
};