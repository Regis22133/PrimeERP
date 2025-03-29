import React from 'react';
import { MessageCircle } from 'lucide-react';

const WhatsAppSupport: React.FC = () => {
  return (
    <a
      href="https://wa.me/message/SIIUZC7AT4FSK1"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 bg-green-500 text-white p-4 rounded-full shadow-lg hover:bg-green-600 transition-colors duration-200 flex items-center justify-center z-50 group"
      title="Suporte via WhatsApp"
    >
      <MessageCircle className="w-6 h-6" />
      <span className="absolute right-full mr-3 bg-white text-gray-800 px-4 py-2 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
        Precisa de ajuda?
      </span>
    </a>
  );
};

export default WhatsAppSupport;