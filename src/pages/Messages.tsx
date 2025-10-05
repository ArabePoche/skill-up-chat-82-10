
import React, { useState } from 'react';
import { Search, MoreVertical, Bell, UserPlus } from 'lucide-react';
import { useConversations } from '@/hooks/useMessages';
import { useNotifications } from '@/hooks/useNotifications';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import NotificationItem from '@/components/NotificationItem';
import StoriesSection from '@/components/StoriesSection';
import { useAuth } from '@/hooks/useAuth';
import { groupMessagesByDate, formatMessageTime } from '@/utils/dateUtils';
import { ContactsDiscoveryDialog } from '@/contacts-discovery/components/ContactsDiscoveryDialog';

const Messages = () => {
  const { data: conversations = [], isLoading: conversationsLoading, error: conversationsError } = useConversations();
  const { notifications = [], isLoading: notificationsLoading } = useNotifications();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('conversations');
  const [isDiscoveryOpen, setIsDiscoveryOpen] = useState(false);

  const handleConversationClick = (conversation: any) => {
    if (conversation.type === 'story_message') {
      navigate(`/story-chat/${conversation.storyId}/${conversation.otherUserId}`);
    } else {
      navigate(`/formation/${conversation.formationId}`);
    }
  };

  // Compter les notifications non lues
  const unreadNotifications = notifications.filter(n => !n.is_read).length;

  // Grouper les conversations par date
  const groupedConversations = groupMessagesByDate(conversations);

  if (conversationsLoading || notificationsLoading) {
    return (
      <div className="min-h-screen bg-white pb-16 md:pt-16 md:pb-0">
        <div className="flex justify-center items-center py-12">
          <div className="text-gray-500">Chargement...</div>
        </div>
      </div>
    );
  }

  if (conversationsError) {
    return (
      <div className="min-h-screen bg-white pb-16 md:pt-16 md:pb-0">
        <div className="flex justify-center items-center py-12">
          <div className="text-red-500">Erreur lors du chargement</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-16 md:pt-16 md:pb-0">
      {/* Header */}
      <div className="bg-edu-whatsapp-green text-white p-4 sticky top-0 md:top-16">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Messages & Notifications</h1>
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
              <span>Conversations</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center space-x-2">
              <Bell size={16} />
              <span>Notifications</span>
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
                  placeholder="Rechercher dans les conversations..."
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
                  <div className="text-gray-500 mb-2">Aucune conversation</div>
                  <p className="text-sm text-gray-400">Cliquez sur le bouton démarrer une discussion pour échanger avec vos contacts</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="notifications" className="mt-0">
            <div className="p-4">
              {!user ? (
                <div className="text-center py-12">
                  <Bell size={48} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600">Connectez-vous pour voir vos notifications</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="bg-white rounded-lg p-8 border text-center">
                  <Bell size={48} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600 font-medium mb-2">Aucune notification</p>
                  <p className="text-gray-500 text-sm">
                    Vous serez notifié ici des nouvelles activités
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {notifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                    />
                  ))}
                </div>
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
          aria-label="Démarrer une discussion"
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
