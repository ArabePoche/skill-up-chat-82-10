
import React, { useState, useMemo } from 'react';
import { Search, MoreVertical, Bell, UserPlus, Users, BookOpen, CreditCard } from 'lucide-react';
import { useConversations } from '@/hooks/useMessages';
import { useNotifications } from '@/hooks/useNotifications';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import NotificationItem from '@/components/NotificationItem';
import StoriesSection from '@/components/StoriesSection';
import { useAuth } from '@/hooks/useAuth';
import { groupMessagesByDate, formatMessageTime } from '@/utils/dateUtils';
import { ContactsDiscoveryDialog } from '@/contacts-discovery/components/ContactsDiscoveryDialog';

const Messages = () => {
  const { data: conversations = [], isLoading: conversationsLoading, error: conversationsError } = useConversations();
  const { notifications = [], isLoading: notificationsLoading } = useNotifications();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('conversations');
  const [isDiscoveryOpen, setIsDiscoveryOpen] = useState(false);

  const handleConversationClick = (conversation: any) => {
    // Navigation selon le type de conversation
    if (conversation.type === 'direct_message') {
      navigate(`/conversations/${conversation.otherUserId}`);
    } else if (conversation.type === 'formation_teacher' || conversation.type === 'formation_student') {
      navigate(`/cours/formation/${conversation.formationId}`);
    }
  };

  // Compter les notifications non lues
  const unreadNotifications = notifications.filter(n => !n.is_read).length;

  // Grouper les conversations par date
  const groupedConversations = groupMessagesByDate(conversations);

  // Grouper les notifications par catégorie
  const groupedNotifications = useMemo(() => {
    const groups = {
      friend_requests: [] as typeof notifications,
      enrollment_requests: [] as typeof notifications,
      plan_changes: [] as typeof notifications,
      payment_requests: [] as typeof notifications,
      others: [] as typeof notifications,
    };

    notifications.forEach((notification) => {
      if (notification.type === 'friend_request' || notification.sender_id) {
        groups.friend_requests.push(notification);
      } else if (notification.type === 'enrollment_request' && notification.enrollment_id) {
        groups.enrollment_requests.push(notification);
      } else if (notification.type === 'plan_change_request') {
        groups.plan_changes.push(notification);
      } else if (notification.type === 'payment_request') {
        groups.payment_requests.push(notification);
      } else {
        groups.others.push(notification);
      }
    });

    return groups;
  }, [notifications]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'friend_requests':
        return <UserPlus className="w-5 h-5" />;
      case 'enrollment_requests':
        return <Users className="w-5 h-5" />;
      case 'plan_changes':
        return <BookOpen className="w-5 h-5" />;
      case 'payment_requests':
        return <CreditCard className="w-5 h-5" />;
      default:
        return <Bell className="w-5 h-5" />;
    }
  };

  const getCategoryTitle = (category: string) => {
    switch (category) {
      case 'friend_requests':
        return 'Demandes d\'amitié';
      case 'enrollment_requests':
        return 'Demandes d\'inscription';
      case 'plan_changes':
        return 'Changements de plan';
      case 'payment_requests':
        return 'Demandes de paiement';
      default:
        return 'Autres notifications';
    }
  };

  const isAdmin = profile?.role === 'admin';

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
          <h1 className="text-xl font-semibold">Discussions & Notifications</h1>
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
              <span>Discussions</span>
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
                <Accordion type="multiple" defaultValue={['friend_requests', 'enrollment_requests', 'plan_changes', 'payment_requests', 'others']} className="space-y-4">
                  {Object.entries(groupedNotifications).map(([category, items]) => {
                    // Ne pas afficher les catégories vides
                    if (items.length === 0) return null;
                    
                    // Ne montrer enrollment_requests, plan_changes et payment_requests qu'aux admins
                    if ((category === 'enrollment_requests' || category === 'plan_changes' || category === 'payment_requests') && !isAdmin) {
                      return null;
                    }

                    return (
                      <AccordionItem key={category} value={category} className="bg-white rounded-lg border">
                        <AccordionTrigger className="px-6 py-4 hover:no-underline">
                          <div className="flex items-center gap-3">
                            <div className="text-primary">
                              {getCategoryIcon(category)}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-900">
                                {getCategoryTitle(category)}
                              </span>
                              <span className="bg-primary/10 text-primary text-sm font-medium px-2.5 py-0.5 rounded-full">
                                {items.length}
                              </span>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-6 pb-4">
                          <div className="space-y-3 pt-2">
                            {items.map((notification) => (
                              <NotificationItem
                                key={notification.id}
                                notification={notification}
                              />
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
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
