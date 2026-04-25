/**
 * Interface de chat entre boutiques
 */
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Send, MessageSquare, Store, Package, Plus, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  useShopConversations,
  useShopMessages,
  useSendShopMessage,
  useMarkMessagesAsRead,
  useDiscoverShopsForChat,
  type ShopConversation
} from '@/hooks/shop/useShopChat';
import { useUserShops } from '@/hooks/shop/useMultiShop';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const ShopChatInterface: React.FC = () => {
  const [selectedConversation, setSelectedConversation] = useState<ShopConversation | null>(null);
  const [messageText, setMessageText] = useState('');
  const [selectedSenderShop, setSelectedSenderShop] = useState<string>('');
  const [discoverOpen, setDiscoverOpen] = useState(false);
  const [discoverSearch, setDiscoverSearch] = useState('');

  const { data: userShops = [] } = useUserShops();
  const { data: conversations = [] } = useShopConversations();
  const { data: discoverableShops = [] } = useDiscoverShopsForChat();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversation?.shop_id, selectedSenderShop]);

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

  const startConversationWith = (shop: { id: string; name: string }) => {
    const newConversation: ShopConversation = {
      shop_id: shop.id,
      shop_name: shop.name,
      last_message: null as any,
      unread_count: 0,
    } as ShopConversation;
    setSelectedConversation(newConversation);
    setDiscoverOpen(false);
    setDiscoverSearch('');
  };

  const filteredDiscoverShops = useMemo(() => {
    if (!discoverSearch.trim()) return discoverableShops;
    const q = discoverSearch.toLowerCase();
    return discoverableShops.filter(
      (s: any) =>
        s.name?.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q) ||
        s.address?.toLowerCase().includes(q)
    );
  }, [discoverableShops, discoverSearch]);

  // Pas de boutique du tout : il faut d'abord en créer une
  if (userShops.length === 0) {
    return (
      <div className="text-center py-16">
        <MessageSquare size={48} className="mx-auto text-gray-300 mb-4" />
        <p className="text-gray-500 mb-2">Chat inter-boutiques</p>
        <p className="text-sm text-gray-400">
          Vous devez d'abord créer ou rejoindre une boutique pour utiliser le chat
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[600px]">
      {/* Liste des conversations */}
      <div className="lg:col-span-1 border rounded-lg overflow-hidden flex flex-col">
        <div className="bg-gray-50 p-3 border-b">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <MessageSquare size={16} className="text-emerald-600" />
              <span className="font-medium">Conversations</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2"
              onClick={() => setDiscoverOpen(true)}
            >
              <Plus size={14} className="mr-1" /> Nouvelle
            </Button>
          </div>

          {/* Sélection boutique expéditrice */}
          {userShops.length > 1 ? (
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
          ) : (
            <p className="text-xs text-gray-500">
              Depuis : <span className="font-medium">{userShops[0]?.name}</span>
            </p>
          )}
        </div>

        <ScrollArea className="flex-1">
          {conversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm space-y-3">
              <p>Aucune conversation</p>
              <Button size="sm" variant="outline" onClick={() => setDiscoverOpen(true)}>
                <Plus size={14} className="mr-1" /> Démarrer une conversation
              </Button>
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
              <Button
                size="sm"
                variant="ghost"
                className="ml-auto h-7 w-7 p-0"
                onClick={() => setSelectedConversation(null)}
              >
                <X size={14} />
              </Button>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-3">
              <div className="space-y-3">
                {messages.length === 0 && (
                  <div className="text-center text-gray-400 text-sm py-8">
                    Aucun message — soyez le premier à écrire à <strong>{selectedConversation.shop_name}</strong>
                  </div>
                )}
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
              {!selectedSenderShop && (
                <p className="text-xs text-amber-600 mb-2">
                  Sélectionnez d'abord votre boutique d'envoi en haut à gauche
                </p>
              )}
              <div className="flex gap-2">
                <Input
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Tapez votre message..."
                  className="flex-1"
                  disabled={!selectedSenderShop}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!messageText.trim() || !selectedSenderShop || sendMessage.isPending}
                  size="sm"
                >
                  <Send size={16} />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500 gap-3">
            <MessageSquare size={48} className="text-gray-300" />
            <p>Sélectionnez une conversation pour commencer</p>
            <Button size="sm" variant="outline" onClick={() => setDiscoverOpen(true)}>
              <Plus size={14} className="mr-1" /> Démarrer une nouvelle conversation
            </Button>
          </div>
        )}
      </div>

      {/* Dialog : découvrir d'autres boutiques */}
      <Dialog open={discoverOpen} onOpenChange={setDiscoverOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Démarrer une conversation</DialogTitle>
          </DialogHeader>

          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              autoFocus
              value={discoverSearch}
              onChange={(e) => setDiscoverSearch(e.target.value)}
              placeholder="Rechercher une boutique..."
              className="pl-9"
            />
          </div>

          <ScrollArea className="max-h-[400px]">
            {filteredDiscoverShops.length === 0 ? (
              <div className="text-center py-8 text-sm text-gray-500">
                {discoverableShops.length === 0
                  ? 'Aucune autre boutique disponible pour le moment'
                  : 'Aucune boutique ne correspond à votre recherche'}
              </div>
            ) : (
              <div className="space-y-1">
                {filteredDiscoverShops.map((shop: any) => (
                  <button
                    key={shop.id}
                    onClick={() => startConversationWith(shop)}
                    className="w-full text-left p-3 rounded-lg hover:bg-emerald-50 transition-colors flex items-start gap-3"
                  >
                    <div className="w-9 h-9 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
                      <Store size={14} className="text-emerald-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{shop.name}</p>
                      {shop.description && (
                        <p className="text-xs text-gray-500 line-clamp-2">{shop.description}</p>
                      )}
                      {shop.address && (
                        <p className="text-xs text-gray-400 truncate">{shop.address}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ShopChatInterface;
