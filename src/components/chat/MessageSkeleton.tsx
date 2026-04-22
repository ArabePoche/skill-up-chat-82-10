import React from 'react';

const MessageSkeleton: React.FC = () => {
  return (
    <div className="flex items-start gap-3 p-4 animate-pulse">
      <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-1/4" />
        <div className="h-16 bg-gray-200 rounded-lg" />
      </div>
    </div>
  );
};

const MessageListSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => {
  return (
    <div className="flex-1 p-4 space-y-4">
      {Array.from({ length: count }).map((_, index) => (
        <MessageSkeleton key={index} />
      ))}
    </div>
  );
};

export { MessageSkeleton, MessageListSkeleton };
