/* Sidebar desktop des conversations avec recherche fixe et liste scrollable. */
import React from 'react';
import { Check, CheckCheck, Search } from 'lucide-react';
import { formatMessageTime } from '@/utils/dateUtils';

type ConversationListItem = {
  id: string;
  name: string;
  lastMessage: string;
  created_at?: string;
  unread: number;
  avatar: string;
  otherUserId: string;
  lastMsgIsOwn?: boolean;
  lastMsgIsDelivered?: boolean;
  lastMsgIsRead?: boolean;
};

interface ConversationsDesktopSidebarProps {
  conversations: ConversationListItem[];
  isLoading: boolean;
  searchQuery: string;
  selectedConversationId?: string;
  onSearchChange: (value: string) => void;
  onSelectConversation: (otherUserId: string) => void;
}

const ConversationsDesktopSidebar = ({
  conversations,
  isLoading,
  searchQuery,
  selectedConversationId,
  onSearchChange,
  onSelectConversation,
}: ConversationsDesktopSidebarProps) => {
  return (
    <aside className="hidden lg:flex lg:h-full lg:min-h-0 lg:w-[390px] lg:min-w-[390px] lg:flex-col lg:overflow-hidden lg:rounded-[28px] lg:border lg:border-white/60 lg:bg-white/55 lg:backdrop-blur-2xl lg:shadow-[0_24px_60px_rgba(124,58,237,0.10)]">
      <div className="border-b border-white/50 bg-[linear-gradient(135deg,rgba(255,255,255,0.68),rgba(255,255,255,0.22)),radial-gradient(circle_at_top_left,rgba(251,113,133,0.18),transparent_52%),radial-gradient(circle_at_bottom_right,rgba(96,165,250,0.18),transparent_48%)] px-5 py-3 text-slate-900">
        <h1 className="text-base font-semibold tracking-tight text-slate-900">Discussions</h1>
        <p className="mt-0.5 text-xs text-slate-600">Retrouvez toutes vos conversations privees.</p>
      </div>

      <div className="flex-1 overflow-hidden px-4 pb-2 pt-2">
        <div className="flex h-full flex-col overflow-hidden rounded-[28px] border border-white/60 bg-white/50 shadow-[0_24px_60px_rgba(124,58,237,0.08)] backdrop-blur-2xl lg:shadow-none">
          <div className="shrink-0 border-b border-white/60 bg-white/80 p-3 backdrop-blur-xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-violet-400" size={18} />
              <input
                type="text"
                placeholder="Rechercher une discussion"
                value={searchQuery}
                onChange={(event) => onSearchChange(event.target.value)}
                className="w-full rounded-2xl border border-white/70 bg-white/70 py-2.5 pl-10 pr-4 text-slate-700 shadow-sm outline-none backdrop-blur-sm placeholder:text-slate-400 focus:border-violet-300 focus:ring-2 focus:ring-violet-200"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-white/40 bg-[linear-gradient(180deg,rgba(255,255,255,0.30),rgba(255,255,255,0.16))]">
            {isLoading ? (
              <div className="px-5 py-6 text-sm text-slate-500">Chargement des discussions...</div>
            ) : conversations.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-slate-500">
                <p>Aucune discussion trouvee.</p>
                <p className="mt-1 text-xs text-slate-400">Essayez un autre nom ou un autre mot-cle.</p>
              </div>
            ) : (
              conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => onSelectConversation(conversation.otherUserId)}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left transition duration-200 hover:bg-white/35 ${
                    conversation.id === selectedConversationId
                      ? 'bg-[linear-gradient(135deg,rgba(99,102,241,0.78),rgba(168,85,247,0.68),rgba(59,130,246,0.62))] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_16px_30px_rgba(139,92,246,0.16)]'
                      : 'bg-transparent text-slate-900'
                  }`}
                >
                  <div
                    className={`flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full text-lg font-semibold text-white ${
                      conversation.id === selectedConversationId
                        ? 'bg-white/30 ring-1 ring-white/40'
                        : 'bg-[linear-gradient(135deg,#f472b6,#a855f7,#60a5fa)]'
                    }`}
                  >
                    {typeof conversation.avatar === 'string'
                    && (conversation.avatar.startsWith('http')
                      || conversation.avatar.startsWith('data:')
                      || conversation.avatar.startsWith('blob:')) ? (
                      <img
                        src={conversation.avatar}
                        alt={conversation.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span>{conversation.avatar}</span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <h2 className={`truncate text-sm font-semibold ${conversation.id === selectedConversationId ? 'text-white' : 'text-slate-900'}`}>
                        {conversation.name}
                      </h2>
                      <span className={`flex-shrink-0 text-xs ${conversation.id === selectedConversationId ? 'text-violet-100' : 'text-slate-400'}`}>
                        {formatMessageTime(conversation.created_at || new Date())}
                      </span>
                    </div>

                    <div className={`flex items-center gap-1 text-sm ${conversation.id === selectedConversationId ? 'text-white/85' : 'text-slate-600'}`}>
                      {conversation.lastMsgIsOwn && (
                        conversation.lastMsgIsRead ? (
                          <CheckCheck size={14} className={`flex-shrink-0 ${conversation.id === selectedConversationId ? 'text-cyan-100' : 'text-sky-500'}`} />
                        ) : conversation.lastMsgIsDelivered ? (
                          <CheckCheck size={14} className={`flex-shrink-0 ${conversation.id === selectedConversationId ? 'text-white/75' : 'text-slate-400'}`} />
                        ) : (
                          <Check size={14} className={`flex-shrink-0 ${conversation.id === selectedConversationId ? 'text-white/75' : 'text-slate-400'}`} />
                        )
                      )}
                      <p className="truncate">{conversation.lastMessage}</p>
                    </div>
                  </div>

                  {conversation.unread > 0 && (
                    <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#ec4899,#8b5cf6,#3b82f6)] text-xs text-white shadow-sm">
                      {conversation.unread}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};

export default ConversationsDesktopSidebar;