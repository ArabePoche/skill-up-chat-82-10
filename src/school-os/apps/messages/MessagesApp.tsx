/**
 * Application de messagerie pour l'école - Style Gmail
 * Interface moderne avec sidebar, liste de messages et vue détaillée
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSchoolYear } from '@/school/context/SchoolYearContext';
import { useSchoolUserRole } from '@/school-os/hooks/useSchoolUserRole';
import { useSchoolMessagesGmail } from './hooks/useSchoolMessagesGmail';

// Composants Gmail
import { MessagesSidebar } from './components/MessagesSidebar';
import { MessageList } from './components/MessageList';
import { MessageDetail } from './components/MessageDetail';
import { ComposeDialog } from './components/ComposeDialog';
import { LabelManager } from './components/LabelManager';

// UI
import { Button } from '@/components/ui/button';
import { Loader2, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export const MessagesApp: React.FC = () => {
  const { t } = useTranslation();
  const { school } = useSchoolYear();
  const { data: roleData, isLoading: isLoadingRole } = useSchoolUserRole(school?.id);

  // État local UI
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [labelManagerOpen, setLabelManagerOpen] = useState(false);

  // Hook principal de gestion des messages
  const {
    currentView,
    currentLabelId,
    selectedMessageIds,
    searchQuery,
    selectedMessage,
    labels,
    messages,
    counts,
    isLoading,
    handleViewChange,
    setSearchQuery,
    setSelectedMessage,
    handleSelectAll,
    handleSelectMessage,
    handleStarToggle,
    handleArchive,
    handleDelete,
    handleMarkRead,
    handleAddLabel,
    handleMessageClick,
    handleCreateLabel,
    handleUpdateLabel,
    handleDeleteLabel,
    handleSendMessage,
    handleSaveDraft,
  } = useSchoolMessagesGmail(school?.id);

  // États de chargement
  if (!school) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted-foreground">{t('schoolOS.common.noData')}</p>
      </div>
    );
  }

  if (isLoadingRole) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header mobile */}
      <div className="lg:hidden flex items-center gap-2 p-3 border-b">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        >
          {mobileSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
        <span className="font-semibold">Messages</span>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Overlay mobile */}
        {mobileSidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div
          className={cn(
            'fixed lg:relative z-50 lg:z-auto h-full transition-transform duration-200',
            mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          )}
        >
          <MessagesSidebar
            currentView={currentView}
            currentLabelId={currentLabelId}
            onViewChange={(view, labelId) => {
              handleViewChange(view, labelId);
              setMobileSidebarOpen(false);
            }}
            onCompose={() => {
              setComposeOpen(true);
              setMobileSidebarOpen(false);
            }}
            labels={labels}
            counts={counts}
            collapsed={sidebarCollapsed}
            onManageLabels={() => setLabelManagerOpen(true)}
          />
        </div>

        {/* Contenu principal */}
        <div className="flex-1 flex overflow-hidden">
          {selectedMessage ? (
            // Vue détaillée du message
            <MessageDetail
              message={selectedMessage}
              labels={labels}
              onBack={() => setSelectedMessage(null)}
              onReply={() => {
                setComposeOpen(true);
                // TODO: pré-remplir avec les infos de réponse
              }}
              onReplyAll={() => setComposeOpen(true)}
              onForward={() => setComposeOpen(true)}
              onArchive={() => {
                handleArchive([selectedMessage.id]);
                setSelectedMessage(null);
              }}
              onDelete={() => {
                handleDelete([selectedMessage.id]);
                setSelectedMessage(null);
              }}
              onStarToggle={() => handleStarToggle(selectedMessage.id)}
              onAddLabel={(labelId) => handleAddLabel([selectedMessage.id], labelId)}
            />
          ) : (
            // Liste des messages
            <MessageList
              messages={messages}
              labels={labels}
              selectedIds={selectedMessageIds}
              onSelectAll={handleSelectAll}
              onSelectMessage={handleSelectMessage}
              onMessageClick={handleMessageClick}
              onStarToggle={handleStarToggle}
              onArchive={handleArchive}
              onDelete={handleDelete}
              onMarkRead={handleMarkRead}
              onAddLabel={handleAddLabel}
              onRefresh={() => {
                // TODO: implémenter le refresh
              }}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              currentView={currentView}
              isLoading={isLoading}
            />
          )}
        </div>
      </div>

      {/* Dialog de composition */}
      <ComposeDialog
        open={composeOpen}
        onOpenChange={setComposeOpen}
        onSend={handleSendMessage}
        onSaveDraft={handleSaveDraft}
      />

      {/* Gestionnaire de labels */}
      <LabelManager
        open={labelManagerOpen}
        onOpenChange={setLabelManagerOpen}
        labels={labels}
        onCreateLabel={handleCreateLabel}
        onUpdateLabel={handleUpdateLabel}
        onDeleteLabel={handleDeleteLabel}
      />
    </div>
  );
};
