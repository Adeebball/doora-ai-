
import React, { useState, useRef } from 'react';
import { SendIcon } from './icons/SendIcon';
import { PaperclipIcon } from './icons/PaperclipIcon';

interface ChatInputProps {
  onSend: (text: string, file: File | null) => void;
  isLoading: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, isLoading }) => {
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
            <div className="bg-gray-700/50 mb-2 p-2 rounded-lg flex justify-between items-center text-sm">
                <div className="flex items-center gap-2 truncate">
                    <PaperclipIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="truncate">{file.name}</span>
                </div>
                <button onClick={removeFile} className="text-gray-400 hover:text-white transition-colors text-xl font-bold">&times;</button>
            </div>
        )}
        <form onSubmit={handleSend} className="flex items-center gap-2 md:gap-4 bg-gray-800 rounded-full p-2 shadow-inner">
            <label htmlFor="file-upload" className="p-2 rounded-full hover:bg-gray-700 cursor-pointer transition-colors">
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
                className="flex-1 bg-transparent focus:outline-none text-gray-100 placeholder-gray-500 px-2"
                disabled={isLoading}
            />
            <button
                type="submit"
                disabled={isLoading || (!inputText.trim() && !file)}
                className="bg-purple-600 rounded-full p-3 text-white disabled:bg-purple-800 disabled:cursor-not-allowed hover:bg-purple-500 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400"
            >
                <SendIcon className="w-6 h-6" />
            </button>
        </form>
    </div>
  );
};
