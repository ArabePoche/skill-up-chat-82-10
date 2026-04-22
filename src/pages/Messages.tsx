
import React, { useMemo, useState } from 'react';
import { Search, MoreVertical, Bell, UserPlus, Check, CheckCheck, Users, Search as SearchIcon, Settings } from 'lucide-react';
import { useConversationsList } from '@/hooks/messages/useConversationsList';
import { useNotificationCategories } from '@/components/notifications/hooks/useNotificationCategories';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import StoriesSection from '@/stories/components/StoriesSection';
import { useAuth } from '@/hooks/useAuth';
import { formatMessageTime } from '@/utils/dateUtils';
import { ContactsDiscoveryDialog } from '@/contacts-discovery/components/ContactsDiscoveryDialog';
import NotificationCategoryItem from '@/components/notifications/NotificationCategoryItem';
import { useTranslation } from 'react-i18next';
import { useI18nReady } from '@/hooks/useI18nReady';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import ConversationsDesktopStoriesBar from '../conversations/components/desktop/ConversationsDesktopStoriesBar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import CreateGroupDialog from '@/components/groups/CreateGroupDialog';
import SearchGroupsDialog from '@/components/groups/SearchGroupsDialog';

const Messages = () => {
  const { t } = useTranslation();
  const i18nReady = useI18nReady();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [isDiscoveryOpen, setIsDiscoveryOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [openCategories, setOpenCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isSearchGroupsOpen, setIsSearchGroupsOpen] = useState(false);

  const { 
    data: conversations = [], 
    isLoading: conversationsLoading, 
    error: conversationsError 
  } = useConversationsList(true);

  const { data: categories = [], isLoading: categoriesLoading } = useNotificationCategories();
  
  const isAdmin = profile?.role === 'admin';

  // Compter les notifications non lues (somme de toutes les catégories)
  const unreadNotifications = categories.reduce((sum, cat) => sum + cat.unreadCount, 0);

  // Filtrer les conversations selon la recherche
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    
    const query = searchQuery.toLowerCase().trim();
    return conversations.filter(conv => 
      conv.name?.toLowerCase().includes(query) || 
      conv.lastMessage?.toLowerCase().includes(query)
    );
  }, [conversations, searchQuery]);

  // Pas de groupement par date, afficher directement les conversations

  const handleConversationClick = (conversation: any) => {
    if (conversation.type === 'direct_message') {
      navigate(`/conversations/${conversation.otherUserId}`);
    } else if (conversation.type === 'formation_teacher' || conversation.type === 'formation_student') {
      navigate(`/cours/formation/${conversation.formationId}`);
    }
  };

  if (!i18nReady) {
    return null;
  }

  if (conversationsLoading) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(251,113,133,0.26),_transparent_24%),radial-gradient(circle_at_top_right,_rgba(168,85,247,0.22),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(96,165,250,0.24),_transparent_30%),linear-gradient(180deg,#fff7fb_0%,#f6f1ff_46%,#edf6ff_100%)] pb-16 md:pt-16 md:pb-0">
        <div className="flex justify-center items-center py-12">
          <div className="text-slate-500">{t('messages.loading')}</div>
        </div>
      </div>
    );
  }

  if (conversationsError) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(251,113,133,0.26),_transparent_24%),radial-gradient(circle_at_top_right,_rgba(168,85,247,0.22),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(96,165,250,0.24),_transparent_30%),linear-gradient(180deg,#fff7fb_0%,#f6f1ff_46%,#edf6ff_100%)] pb-16 md:pt-16 md:pb-0">
        <div className="flex justify-center items-center py-12">
          <div className="text-red-500">{t('messages.loadingError')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(251,113,133,0.26),_transparent_24%),radial-gradient(circle_at_top_right,_rgba(168,85,247,0.22),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(96,165,250,0.24),_transparent_30%),linear-gradient(180deg,#fff7fb_0%,#f6f1ff_46%,#edf6ff_100%)] pb-16 md:pt-16 md:pb-0 lg:h-full lg:max-h-full lg:flex-1 lg:min-h-0 lg:flex lg:flex-col lg:pt-0 lg:overflow-hidden">
      <div className="lg:flex lg:flex-1 lg:max-h-full lg:min-h-0 lg:flex-col lg:gap-5 lg:px-5 lg:pt-0 lg:pb-0">
        <div className="hidden lg:block lg:shrink-0">
          <ConversationsDesktopStoriesBar />
        </div>

        <div className="lg:flex lg:min-h-0 lg:flex-1 lg:gap-5">
          <section className="lg:flex lg:h-full lg:min-h-0 lg:w-[390px] lg:min-w-[390px] lg:flex-col lg:overflow-visible lg:rounded-[28px] lg:border lg:border-white/60 lg:bg-white/50 lg:shadow-[0_24px_60px_rgba(124,58,237,0.08)] lg:backdrop-blur-2xl">
          <div className="sticky top-0 z-10 bg-[radial-gradient(circle_at_top_left,rgba(251,113,133,0.34),transparent_34%),radial-gradient(circle_at_top_right,rgba(167,139,250,0.32),transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.30),rgba(255,255,255,0.10)),linear-gradient(135deg,#fb7185,#a855f7,#60a5fa)] p-4 text-white backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-semibold tracking-tight">{t('messages.title')}</h1>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setIsNotificationsOpen(true)}
                  className="relative rounded-full p-2 transition-colors hover:bg-white/12"
                  aria-label={t('profile.notifications')}
                >
                  <Bell size={20} />
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-[1.1rem] min-w-[1.1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
                      {unreadNotifications > 99 ? '99+' : unreadNotifications}
                    </span>
                  )}
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="rounded-full p-2 transition-colors hover:bg-white/12"
                      aria-label={t('common.more', { defaultValue: 'Plus' })}
                    >
                      <MoreVertical size={20} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="z-[99999]">
                    <DropdownMenuItem onClick={() => setIsCreateGroupOpen(true)}>
                      <Users className="w-4 h-4 mr-2" />
                      Créer un groupe
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsSearchGroupsOpen(true)}>
                      <SearchIcon className="w-4 h-4 mr-2" />
                      Rechercher un groupe
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled>
                      <Settings className="w-4 h-4 mr-2" />
                      Paramètres (bientôt)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          <div className="lg:flex-1 lg:min-h-0 lg:overflow-y-auto">
            <div className="px-3 pb-4 pt-3 md:px-4 lg:px-4">
              <div className="overflow-hidden rounded-[28px] border border-white/60 bg-white/50 shadow-[0_24px_60px_rgba(124,58,237,0.08)] backdrop-blur-2xl lg:shadow-none">
                <div className="p-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 transform text-violet-400" size={18} />
                    <input
                      type="text"
                      placeholder={t('messages.searchPlaceholder')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-2xl border border-white/70 bg-white/70 py-3 pl-10 pr-4 text-slate-700 shadow-sm outline-none backdrop-blur-sm placeholder:text-slate-400 focus:border-violet-300 focus:ring-2 focus:ring-violet-200"
                    />
                  </div>
                </div>

                <div className="divide-y divide-white/40 bg-[linear-gradient(180deg,rgba(255,255,255,0.30),rgba(255,255,255,0.16))]">
                  {filteredConversations.length > 0 ? (
                    filteredConversations.map((conversation) => (
                      <div
                        key={conversation.id}
                        className="flex cursor-pointer items-center p-4 transition-colors hover:bg-white/32"
                        onClick={() => handleConversationClick(conversation)}
                      >
                        <div className="relative mr-3">
                          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-[linear-gradient(135deg,#f472b6,#a855f7,#60a5fa)] text-white shadow-sm">
                            {typeof conversation.avatar === 'string' && (conversation.avatar.startsWith('http') || conversation.avatar.startsWith('data:') || conversation.avatar.startsWith('blob:')) ? (
                              <img 
                                src={conversation.avatar} 
                                alt={conversation.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-white font-bold text-xl">{conversation.avatar}</span>
                            )}
                          </div>
                          {conversation.online && (
                            <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-400"></div>
                          )}
                        </div>
                        
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex items-center justify-between">
                            <h3 className="truncate font-medium text-slate-900">{conversation.name}</h3>
                            <span className="flex-shrink-0 text-xs text-slate-500">
                              {formatMessageTime(conversation.created_at || new Date())}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            {conversation.lastMsgIsOwn && (
                              conversation.lastMsgIsRead ? (
                                <CheckCheck size={16} className="flex-shrink-0 text-sky-500" />
                              ) : conversation.lastMsgIsDelivered ? (
                                <CheckCheck size={16} className="flex-shrink-0 text-slate-400" />
                              ) : (
                                <Check size={16} className="flex-shrink-0 text-slate-400" />
                              )
                            )}
                            <p className="truncate text-sm text-slate-600">{conversation.lastMessage}</p>
                          </div>
                        </div>
                        
                        {conversation.unread > 0 && (
                          <div className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-[linear-gradient(135deg,#ec4899,#8b5cf6,#3b82f6)] text-xs text-white shadow-sm">
                            {conversation.unread}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="py-12 text-center">
                      <div className="mb-2 text-slate-500">{t('messages.noConversations')}</div>
                      <p className="text-sm text-slate-400">{t('messages.noConversationsHelp')}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="hidden lg:flex lg:min-h-0 lg:flex-1 lg:flex-col lg:overflow-hidden lg:rounded-[28px] lg:border lg:border-white/60 lg:bg-white/36 lg:shadow-[0_24px_60px_rgba(124,58,237,0.08)] lg:backdrop-blur-2xl">
          <div className="flex h-full flex-col items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(251,113,133,0.14),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(96,165,250,0.14),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.30),rgba(255,255,255,0.14))] px-10 text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[linear-gradient(135deg,rgba(244,114,182,0.18),rgba(168,85,247,0.18),rgba(96,165,250,0.18))] ring-1 ring-white/60">
              <Bell size={30} className="text-violet-500" />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Choisissez une discussion</h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-slate-600">
              Sélectionnez une conversation dans la colonne de gauche pour afficher les messages ici, comme dans une interface de messagerie desktop.
            </p>
          </div>
        </section>
        </div>
      </div>

      <Sheet open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
        <SheetContent side="right" className="w-full bg-[radial-gradient(circle_at_top_left,_rgba(251,113,133,0.22),_transparent_26%),radial-gradient(circle_at_top_right,_rgba(168,85,247,0.20),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(96,165,250,0.20),_transparent_30%),linear-gradient(180deg,#fff9fc_0%,#f7f2ff_54%,#eef7ff_100%)] p-0 sm:max-w-md">
          <SheetHeader className="border-b border-white/50 px-4 py-4 backdrop-blur-sm">
            <SheetTitle className="flex items-center gap-2 pr-8">
              <Bell size={18} />
              {t('profile.notifications')}
              {unreadNotifications > 0 && (
                <Badge variant="destructive" className="ml-1">
                  {unreadNotifications > 99 ? '99+' : unreadNotifications}
                </Badge>
              )}
            </SheetTitle>
          </SheetHeader>

          <div className="h-[calc(100vh-80px)] overflow-y-auto p-4">
            {!user ? (
              <div className="text-center py-12">
                <Bell size={48} className="mx-auto mb-4 text-slate-400" />
                <p className="text-slate-600">{t('messages.loginToSeeNotifications')}</p>
              </div>
            ) : categoriesLoading ? (
              <div className="py-12 text-center text-slate-500">
                {t('messages.loading')}
              </div>
            ) : categories.length === 0 ? (
              <div className="rounded-3xl border border-white/60 bg-white/55 p-8 text-center shadow-[0_18px_40px_rgba(124,58,237,0.08)] backdrop-blur-sm">
                <Bell size={48} className="mx-auto mb-4 text-slate-400" />
                <p className="mb-2 font-medium text-slate-600">{t('messages.noNotifications')}</p>
                <p className="text-sm text-slate-500">
                  {t('messages.noNotificationsHelp')}
                </p>
              </div>
            ) : (
              <Accordion
                type="multiple"
                value={openCategories}
                onValueChange={setOpenCategories}
                className="space-y-4"
              >
                {categories.map((categoryData) => {
                  const { category, totalCount, unreadCount } = categoryData;

                  if (['enrollment_requests', 'plan_changes', 'payment_requests'].includes(category) && !isAdmin) {
                    return null;
                  }

                  return (
                    <NotificationCategoryItem
                      key={category}
                      category={category}
                      totalCount={totalCount}
                      unreadCount={unreadCount}
                      isOpen={openCategories.includes(category)}
                    />
                  );
                })}
              </Accordion>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Dialogs pour les groupes */}
      <CreateGroupDialog
        open={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
        onGroupCreated={(groupId) => {
          setIsCreateGroupOpen(false);
          navigate(`/groups/${groupId}`);
        }}
      />
      <SearchGroupsDialog
        open={isSearchGroupsOpen}
        onClose={() => setIsSearchGroupsOpen(false)}
        onGroupJoined={(groupId) => {
          setIsSearchGroupsOpen(false);
          navigate(`/groups/${groupId}`);
        }}
      />

      <ContactsDiscoveryDialog
        open={isDiscoveryOpen}
        onOpenChange={setIsDiscoveryOpen}
      />
    </>
  );
};

export default Messages;
