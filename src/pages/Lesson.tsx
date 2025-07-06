
import React, { useRef } from 'react';
import { useParams } from 'react-router-dom';
import VideoMessageSwitch from '@/components/video/VideoMessageSwitch';

const Lesson = () => {
  const { lessonId } = useParams();
  const videoRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);

  const scrollToVideo = () => {
    videoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const scrollToMessages = () => {
    messagesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16 md:pt-16 md:pb-0">
      {/* Section Vidéo */}
      <div ref={videoRef} className="bg-black">
        <div className="aspect-video flex items-center justify-center text-white">
          <div className="text-center">
            <div className="text-6xl mb-4">🎥</div>
            <h2 className="text-xl font-semibold">Vidéo de la leçon</h2>
            <p className="text-gray-300 mt-2">Lesson ID: {lessonId}</p>
          </div>
        </div>
      </div>

      {/* Bouton Switch */}
      <div className="relative -mt-3 -mb-3 z-20 flex justify-center">
        <VideoMessageSwitch
          onScrollToVideo={scrollToVideo}
          onScrollToMessages={scrollToMessages}
        />
      </div>

      {/* Section Messages */}
      <div ref={messagesRef} className="p-4 min-h-[400px]">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Discussion</h2>
        
        {/* Messages simulés */}
        <div className="space-y-4">
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
              <div className={`
                max-w-xs px-4 py-2 rounded-lg
                ${i % 2 === 0 
                  ? 'bg-white text-gray-800 border' 
                  : 'bg-[#25d366] text-white'
                }
              `}>
                <p>Message {i + 1} - Contenu du message de discussion</p>
                <span className="text-xs opacity-70">12:3{i}</span>
              </div>
            </div>
          ))}
        </div>
        
        {/* Dernier message (référence pour le scroll) */}
        <div className="flex justify-end mt-4">
          <div className="max-w-xs px-4 py-2 rounded-lg bg-[#25d366] text-white">
            <p>💬 Dernier message du chat</p>
            <span className="text-xs opacity-70">12:45</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Lesson;
