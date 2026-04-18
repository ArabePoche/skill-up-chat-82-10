/* Bandeau desktop des stories affiche au-dessus de la sidebar et du panneau de discussion. */
import React from 'react';
import StoriesSection from '@/stories/components/StoriesSection';

const ConversationsDesktopStoriesBar = () => {
  return (
    <section className="lg:col-span-2 lg:overflow-hidden lg:rounded-[28px] lg:border lg:border-white/60 lg:bg-white/50 lg:shadow-[0_24px_60px_rgba(124,58,237,0.08)] lg:backdrop-blur-2xl">
      <div className="bg-[linear-gradient(180deg,rgba(255,255,255,0.28),rgba(255,255,255,0.18))] backdrop-blur-sm">
        <StoriesSection />
      </div>
    </section>
  );
};

export default ConversationsDesktopStoriesBar;