import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const ChatBot = () => {
    const [isHovered, setIsHovered] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [messages, setMessages] = useState([]);
    const [imageIndex, setImageIndex] = useState(0);
    const chatEndRef = useRef(null);
    const navigate = useNavigate();

    const images = [
        '/image-removebg-preview (1) (1).png',
        '/image-removebg-preview (2) (1).png',
        '/image-removebg-preview (4).png'
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setImageIndex((prev) => (prev + 1) % images.length);
        }, 2500);
        return () => clearInterval(interval);
    }, [images.length]);

    useEffect(() => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const handleSend = (e) => {
        e.preventDefault();
        if (!inputValue.trim()) return;

        const newUserMessage = { text: inputValue, sender: 'user' };
        setMessages([...messages, newUserMessage]);
        setInputValue('');
        setIsOpen(true);

        setTimeout(() => {
            setMessages((prev) => [
                ...prev,
                { text: "I'm Docyyy!! How can I help you today?", sender: 'bot' }
            ]);
        }, 1000);
    };

    return (
        <div
            className={`fixed bottom-[2px] right-[2px] z-[1000] transition-transform duration-300 pointer-events-none group `}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="relative pointer-events-auto cursor-pointer flex flex-col items-center">
                {/* Chat Window */}
                <div
                    className={`absolute bottom-[230px] right-[5px] w-[350px] max-h-[450px] bg-[rgba(255,252,240,0.98)] backdrop-blur-[12px] rounded-[20px] shadow-[0_15px_40px_rgba(58,77,44,0.15)] border border-[rgba(58,77,44,0.1)] flex flex-col overflow-hidden transition-all duration-400 ease-[cubic-bezier(0.4,0,0.2,1)] ${isOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible translate-y-4'
                        }`}
                >
                    {/* Header */}
                    <div className="px-4 py-2 bg-[#3a4d2c] text-[#fffcf0] flex items-center justify-between">
                        <div className="flex items-center gap-[8px]">
                            <span className="font-bold text-sm">Docyyy!!</span>
                            
                        </div>
                        <button
                            className="bg-transparent border-none text-[#fffcf0] cursor-pointer p-[4px] flex items-center opacity-60 hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsOpen(false);
                                setMessages([]);
                                setIsHovered(false);
                            }}
                        >
                            <svg viewBox="0 0 24 24" width="16" height="16">
                                <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                            </svg>
                        </button>
                    </div>

                    {/* Messages Container */}
                    <div className="p-4 overflow-y-auto flex-1 flex flex-col gap-2">
                        {messages.length === 0 && (
                            <div className="bg-[#e9e5d3] text-[#2c3623] px-3.5 py-2 rounded-[15px_15px_15px_4px] max-w-[85%] text-[13px]">
                                Hello! I'm Docyyy!!. Ask me anything!
                            </div>
                        )}
                        {messages.map((msg, i) => (
                            <div
                                key={i}
                                className={`px-3.5 py-2 rounded-[15px] max-w-[85%] text-[13px] ${msg.sender === 'bot'
                                        ? 'bg-[#e9e5d3] text-[#2c3623] rounded-bl-[4px]'
                                        : 'bg-[#3a4d2c] text-[#fffcf0] rounded-br-[4px] self-end'
                                    }`}
                            >
                                {msg.text}
                            </div>
                        ))}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Input Area */}
                    <form className="p-3 border-t border-black/5 flex items-center gap-2" onSubmit={handleSend}>
                        <input
                            className="flex-1 border border-black/5 outline-none px-3.5 py-2 rounded-[10px] text-xs bg-[#fffcf0] text-[#2c3623]"
                            type="text"
                            placeholder="Ask me anything..."
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                        />
                    </form>

                    {/* Workshop Navigation */}
                    <div className="px-3 pb-3">
                        <button
                            className="w-full p-2 bg-[#3a4d2c] text-[#fffcf0] border-none rounded-[10px] text-xs font-semibold cursor-pointer hover:bg-[#4a5d3c] transition-colors"
                            onClick={() => window.open('/workshop', '_blank')}
                        >
                            🚀 Open Advanced Workshop
                        </button>
                    </div>
                </div>

                {/* Character Trigger */}
                <div
                    className="w-[120px] h-[120px] flex items-center justify-center pd-2 mr-8 mb-8 drop-shadow-[0_8px_20px_rgba(0,0,0,0.12)]"
                    onClick={() => setIsOpen(true)}
                >
                    <img
                        src={images[imageIndex]}
                        alt="Docyyy!!"
                        className="w-full h-full object-contain transition-opacity duration-500"
                    />
                </div>
            </div>
        </div>
    );
};

export default ChatBot;
