
import React, { useState, useMemo } from 'react';
import { Search, MoreVertical, Bell, UserPlus, Users, BookOpen, CreditCard } from 'lucide-react';
import { useConversationsList } from '@/hooks/messages/useConversationsList';
import { useNotificationCategories } from '@/hooks/notifications/useNotificationCategories';
import { useCategoryNotifications } from '@/hooks/notifications/useCategoryNotifications';
import { useNotificationActions } from '@/hooks/notifications/useNotificationActions';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import NotificationItem from '@/components/NotificationItem';
import StoriesSection from '@/stories/components/StoriesSection';
import { useAuth } from '@/hooks/useAuth';
import { groupMessagesByDate, formatMessageTime } from '@/utils/dateUtils';
import { ContactsDiscoveryDialog } from '@/contacts-discovery/components/ContactsDiscoveryDialog';
import NotificationCategoryItem from '@/components/notifications/NotificationCategoryItem';
import { useTranslation } from 'react-i18next';
import { useI18nReady } from '@/hooks/useI18nReady';

const Messages = () => {
  const { t } = useTranslation();
  const i18nReady = useI18nReady();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('conversations');
  const [isDiscoveryOpen, setIsDiscoveryOpen] = useState(false);
  const [openCategories, setOpenCategories] = useState<string[]>([]);

  // Charger les conversations uniquement quand l'onglet est actif
  const { 
    data: conversations = [], 
    isLoading: conversationsLoading, 
    error: conversationsError 
  } = useConversationsList(activeTab === 'conversations');

  // Charger uniquement les catégories de notifications (compteurs)
  const { data: categories = [], isLoading: categoriesLoading } = useNotificationCategories();
  
  const isAdmin = profile?.role === 'admin';

  // Compter les notifications non lues (somme de toutes les catégories)
  const unreadNotifications = categories.reduce((sum, cat) => sum + cat.unreadCount, 0);

  // Grouper les conversations par date
  const groupedConversations = groupMessagesByDate(conversations);

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

  if ((activeTab === 'conversations' && conversationsLoading) || (activeTab === 'notifications' && categoriesLoading)) {
    return (
      <div className="min-h-screen bg-white pb-16 md:pt-16 md:pb-0">
        <div className="flex justify-center items-center py-12">
          <div className="text-gray-500">{t('messages.loading')}</div>
        </div>
      </div>
    );
  }

  if (conversationsError) {
    return (
      <div className="min-h-screen bg-white pb-16 md:pt-16 md:pb-0">
        <div className="flex justify-center items-center py-12">
          <div className="text-red-500">{t('messages.loadingError')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-16 md:pt-16 md:pb-0">
      {/* Header */}
      <div className="bg-edu-whatsapp-green text-white p-4 sticky top-0 md:top-16">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">{t('messages.title')}</h1>
          <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <MoreVertical size={20} />
          </button>
        </div>
      </div>

      {/* Stories Section */}
      <StoriesSection />

      {/* Tabs */}
      <div className="bg-gray-50">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-gray-50">
            <TabsTrigger value="conversations" className="flex items-center space-x-2">
              <span>{t('messages.conversations')}</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center space-x-2">
              <Bell size={16} />
              <span>{t('profile.notifications')}</span>
              {unreadNotifications > 0 && (
                <Badge variant="destructive" className="h-5 w-5 flex items-center justify-center p-0 text-xs">
                  {unreadNotifications > 99 ? '99+' : unreadNotifications}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="conversations" className="mt-0">
            {/* Search */}
            <div className="p-4 bg-gray-50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder={t('messages.searchPlaceholder')}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-edu-primary focus:border-transparent"
                />
              </div>
            </div>

            {/* Conversations List grouped by date */}
            <div className="divide-y divide-gray-100">
              {Object.keys(groupedConversations).length > 0 ? (
                Object.entries(groupedConversations).map(([dateGroup, groupConversations]) => (
                  <div key={dateGroup}>
                    <div className="sticky top-0 bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600 border-b border-gray-200">
                      {dateGroup}
                    </div>
                    {groupConversations.map((conversation) => (
                      <div
                        key={conversation.id}
                        className="flex items-center p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => handleConversationClick(conversation)}
                      >
                        <div className="relative mr-3">
                          <div className="w-12 h-12 bg-edu-primary rounded-full flex items-center justify-center overflow-hidden">
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
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-medium text-gray-900 truncate">{conversation.name}</h3>
                            <span className="text-xs text-gray-500 flex-shrink-0">
                              {formatMessageTime(conversation.created_at || new Date())}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 truncate">{conversation.lastMessage}</p>
                        </div>
                        
                        {conversation.unread > 0 && (
                          <div className="ml-2 bg-edu-primary text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                            {conversation.unread}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <div className="text-gray-500 mb-2">{t('messages.noConversations')}</div>
                  <p className="text-sm text-gray-400">{t('messages.noConversationsHelp')}</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="notifications" className="mt-0">
            <div className="p-4">
              {!user ? (
                <div className="text-center py-12">
                  <Bell size={48} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600">{t('messages.loginToSeeNotifications')}</p>
                </div>
              ) : categories.length === 0 ? (
                <div className="bg-white rounded-lg p-8 border text-center">
                  <Bell size={48} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600 font-medium mb-2">{t('messages.noNotifications')}</p>
                  <p className="text-gray-500 text-sm">
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
                    
                    // Ne montrer les catégories admin qu'aux admins
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
          </TabsContent>
        </Tabs>
      </div>

      {/* Bouton flottant pour démarrer une discussion - visible uniquement dans l'onglet Conversations */}
      {activeTab === 'conversations' && (
        <Button
          onClick={() => setIsDiscoveryOpen(true)}
          className="fixed bottom-20 md:bottom-6 right-6 h-14 w-14 rounded-full bg-edu-whatsapp-green hover:bg-edu-whatsapp-green/90 shadow-lg z-50 p-0 flex items-center justify-center"
          aria-label={t('messages.startDiscussion')}
        >
          <UserPlus size={24} className="text-white" />
        </Button>
      )}

      {/* Dialog de découverte de contacts */}
      <ContactsDiscoveryDialog
        open={isDiscoveryOpen}
        onOpenChange={setIsDiscoveryOpen}
      />
    </div>
  );
};

export default Messages;
