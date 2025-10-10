import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import FollowingList from './FollowingList';
import FriendsList from './FriendsList';
import SuggestionsList from './SuggestionsList';

/**
 * Modal pour afficher les amis, suivis et suggestions
 */
interface FriendsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: 'following' | 'friends' | 'suggestions';
  userId?: string;
}

const FriendsModal: React.FC<FriendsModalProps> = ({
  open,
  onOpenChange,
  defaultTab = 'friends',
  userId
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Relations</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue={defaultTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="following">Suivis</TabsTrigger>
            <TabsTrigger value="friends">Amis</TabsTrigger>
            <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
          </TabsList>

          <TabsContent value="following" className="flex-1 overflow-y-auto mt-4">
            <FollowingList userId={userId} />
          </TabsContent>

          <TabsContent value="friends" className="flex-1 overflow-y-auto mt-4">
            <FriendsList userId={userId} />
          </TabsContent>

          <TabsContent value="suggestions" className="flex-1 overflow-y-auto mt-4">
            <SuggestionsList />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default FriendsModal;
