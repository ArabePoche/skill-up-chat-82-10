/**
 * Interface de chat entre boutiques
 */
import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, Store, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  useShopConversations,
  useShopMessages,
  useSendShopMessage,
  useMarkMessagesAsRead,
  type ShopConversation
} from '@/hooks/shop/useShopChat';
import { useUserShops } from '@/hooks/shop/useMultiShop';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const ShopChatInterface: React.FC = () => {
  const [selectedConversation, setSelectedConversation] = useState<ShopConversation | null>(null);
  const [messageText, setMessageText] = useState('');
  const [selectedSenderShop, setSelectedSenderShop] = useState<string>('');
  
  const { data: userShops = [] } = useUserShops();
  const { data: conversations = [] } = useShopConversations();
  const { data: messages = [] } = useShopMessages(
    selectedSenderShop, 
    selectedConversation?.shop_id || ''
  );
  
  const sendMessage = useSendShopMessage();
  const markAsRead = useMarkMessagesAsRead();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll vers le bas quand de nouveaux messages arrivent
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Marquer les messages comme lus quand on ouvre une conversation
  useEffect(() => {
    if (selectedConversation && selectedSenderShop) {
      markAsRead.mutate({
        receiverShopId: selectedSenderShop,
        senderShopId: selectedConversation.shop_id,
      });
    }
  }, [selectedConversation, selectedSenderShop, markAsRead]);

  // Sélectionner la première boutique par défaut
  useEffect(() => {
    if (userShops.length > 0 && !selectedSenderShop) {
      setSelectedSenderShop(userShops[0].id);
    }
  }, [userShops, selectedSenderShop]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedConversation || !selectedSenderShop) return;

    try {
      await sendMessage.mutateAsync({
        senderShopId: selectedSenderShop,
        receiverShopId: selectedConversation.shop_id,
        content: messageText.trim(),
      });
      setMessageText('');
    } catch (error) {
      console.error('Erreur envoi message:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (userShops.length < 2) {
    return (
      <div className="text-center py-16">
        <MessageSquare size={48} className="mx-auto text-gray-300 mb-4" />
        <p className="text-gray-500 mb-2">Chat inter-boutiques</p>
        <p className="text-sm text-gray-400">
          Vous avez besoin d'au moins 2 boutiques pour utiliser le chat
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[600px]">
      {/* Liste des conversations */}
      <div className="lg:col-span-1 border rounded-lg overflow-hidden">
        <div className="bg-gray-50 p-3 border-b">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare size={16} className="text-emerald-600" />
            <span className="font-medium">Conversations</span>
          </div>
          
          {/* Sélection boutique expéditrice */}
          <select
            value={selectedSenderShop}
            onChange={(e) => setSelectedSenderShop(e.target.value)}
            className="w-full text-sm border rounded px-2 py-1 bg-white"
          >
            <option value="">Choisir votre boutique</option>
            {userShops.map(shop => (
              <option key={shop.id} value={shop.id}>
                {shop.name}
              </option>
            ))}
          </select>
        </div>

        <ScrollArea className="h-full">
          {conversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              Aucune conversation
            </div>
          ) : (
            <div className="p-2">
              {conversations.map(conversation => (
                <div
                  key={conversation.shop_id}
                  onClick={() => setSelectedConversation(conversation)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedConversation?.shop_id === conversation.shop_id
                      ? 'bg-emerald-50 border border-emerald-200'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
                        <Store size={14} className="text-emerald-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">
                          {conversation.shop_name}
                        </p>
                        {conversation.last_message && (
                          <p className="text-xs text-gray-500 truncate">
                            {conversation.last_message.content}
                          </p>
                        )}
                      </div>
                    </div>
                    {conversation.unread_count > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {conversation.unread_count}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Zone de chat */}
      <div className="lg:col-span-2 border rounded-lg flex flex-col">
        {selectedConversation ? (
          <>
            {/* Header conversation */}
            <div className="bg-gray-50 p-3 border-b flex items-center gap-2">
              <Store size={16} className="text-emerald-600" />
              <span className="font-medium">{selectedConversation.shop_name}</span>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-3">
              <div className="space-y-3">
                {messages.map(message => {
                  const isFromCurrentUser = message.sender_shop_id === selectedSenderShop;
                  
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isFromCurrentUser ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
                          isFromCurrentUser
                            ? 'bg-emerald-500 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        
                        {/* Référence transfert */}
                        {message.transfer && (
                          <div className="mt-2 p-2 rounded bg-white/20 text-xs">
                            <div className="flex items-center gap-1">
                              <Package size={12} />
                              <span>Transfert: {message.transfer.product_name}</span>
                            </div>
                            <div>Quantité: {message.transfer.quantity}</div>
                            <div>Status: {message.transfer.status}</div>
                          </div>
                        )}
                        
                        <p className="text-xs opacity-70 mt-1">
                          {format(new Date(message.created_at), 'HH:mm', { locale: fr })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Saisie message */}
            <div className="p-3 border-t">
              <div className="flex gap-2">
                <Input
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Tapez votre message..."
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!messageText.trim() || sendMessage.isPending}
                  size="sm"
                >
                  <Send size={16} />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <MessageSquare size={48} className="mx-auto text-gray-300 mb-4" />
              <p>Sélectionnez une conversation pour commencer</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShopChatInterface;