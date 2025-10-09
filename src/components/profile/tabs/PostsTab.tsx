import React from 'react';
import { FileText } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePosts } from '@/hooks/usePosts';
import PostCard from '@/components/PostCard';

const PostsTab: React.FC = () => {
  const { user } = useAuth();
  const { data: posts, isLoading } = usePosts('all', user?.id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Chargement des posts...</div>
      </div>
    );
  }

  if (!posts || posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <FileText size={32} className="text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Aucun post</h3>
        <p className="text-sm text-muted-foreground">
          Vos posts apparaîtront ici
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      {posts.map((post: any) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
};

export default PostsTab;
