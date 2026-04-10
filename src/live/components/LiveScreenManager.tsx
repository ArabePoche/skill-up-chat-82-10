import React, { useMemo, useState } from 'react';
import { BookOpen, Eye, GraduationCap, Layers3, PackageSearch, ShoppingBag, Sparkles, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import LiveScreenDisplay from '@/live/components/LiveScreenDisplay';
import { LiveTeachingStudioEditor } from '@/live/components/studio-live';
import type { LiveFormation, LiveMarketplaceProduct, LiveScreen, LiveScreenKind, LiveTeachingStudio } from '@/live/types';
import { getLiveFormationImage, getLiveProductImage, getLiveTeachingStudioImage } from '@/live/types';

interface LiveScreenManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: LiveMarketplaceProduct[];
  formations: LiveFormation[];
  publicScreen: LiveScreen | null;
  privateScreen: LiveScreen | null;
  onSelectPublicScreen: (screen: LiveScreen | null) => void;
  onSelectPrivateScreen: (screen: LiveScreen | null) => void;
}

const buildScreenFromProduct = (product: LiveMarketplaceProduct): LiveScreen => ({
  type: 'shop_product',
  product,
  activatedAt: new Date().toISOString(),
});

const buildScreenFromFormation = (formation: LiveFormation): LiveScreen => ({
  type: 'formation_enrollment',
  formation,
  activatedAt: new Date().toISOString(),
});

export const buildScreenFromStudio = (studio: LiveTeachingStudio): LiveScreen => ({
  type: 'teaching_studio',
  studio,
  activatedAt: new Date().toISOString(),
});

const LiveScreenManager: React.FC<LiveScreenManagerProps> = ({
  open,
  onOpenChange,
  products,
  formations,
  publicScreen,
  privateScreen,
  onSelectPublicScreen,
  onSelectPrivateScreen,
}) => {
  const [activeTab, setActiveTab] = useState<'public' | 'private'>('public');
  const [kindByTab, setKindByTab] = useState<Record<'public' | 'private', LiveScreenKind>>({
    public: 'shop_product',
    private: 'formation_enrollment',
  });
  const [searchByTab, setSearchByTab] = useState<Record<'public' | 'private', string>>({
    public: '',
    private: '',
  });
  const [studioEditorOpen, setStudioEditorOpen] = useState(false);

  const currentScreen = activeTab === 'public' ? publicScreen : privateScreen;
  const searchValue = searchByTab[activeTab].trim().toLowerCase();

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      if (!searchValue) {
        return true;
      }

      return `${product.title} ${product.description || ''}`.toLowerCase().includes(searchValue);
    });
  }, [products, searchValue]);

  const filteredFormations = useMemo(() => {
    return formations.filter((formation) => {
      if (!searchValue) {
        return true;
      }

      return `${formation.title} ${formation.description || ''}`.toLowerCase().includes(searchValue);
    });
  }, [formations, searchValue]);

  const filteredTeachingStudios = useMemo(() => {
    const activeStudio = currentScreen?.type === 'teaching_studio' ? currentScreen.studio : null;
    const fallbackTitle = activeStudio?.title || 'Studio de cours';
    const fallbackSubtitle = activeStudio?.subtitle || 'Écran enseignant libre et accessible à tous.';
    const fallbackSummary = activeStudio?.summary || '';

    if (searchValue && !`${fallbackTitle} ${fallbackSubtitle} ${fallbackSummary}`.toLowerCase().includes(searchValue)) {
      return [];
    }

    return [{
      id: 'default-studio',
      title: fallbackTitle,
      subtitle: fallbackSubtitle,
      summary: fallbackSummary,
      coverImageUrl: activeStudio?.cover_image_url || null,
    }];
  }, [currentScreen, searchValue]);

  const applyScreen = (screen: LiveScreen | null) => {
    if (activeTab === 'public') {
      onSelectPublicScreen(screen);
      return;
    }

    onSelectPrivateScreen(screen);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-0.75rem)] w-[calc(100vw-0.75rem)] max-w-none flex-col overflow-hidden border-zinc-800 bg-zinc-950 p-0 text-white sm:max-h-[92vh] sm:max-w-5xl sm:p-6">
        <DialogHeader className="px-4 pt-5 sm:px-0 sm:pt-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Layers3 className="h-5 w-5 text-amber-400" />
            Écrans du live
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Choisissez un écran public diffusé aux spectateurs ou un écran privé visible uniquement par vous.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'public' | 'private')} className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-4 pb-4 sm:px-0 sm:pb-0">
          <TabsList className="grid w-full grid-cols-2 bg-zinc-900 sm:inline-flex sm:w-fit">
            <TabsTrigger value="public" className="w-full">Public</TabsTrigger>
            <TabsTrigger value="private" className="w-full">Privé</TabsTrigger>
          </TabsList>

          {(['public', 'private'] as const).map((tab) => (
            <TabsContent key={tab} value={tab} className="mt-0 min-h-0 flex-1 overflow-hidden outline-none">
              <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant={kindByTab[tab] === 'shop_product' ? 'default' : 'outline'}
                      className={kindByTab[tab] === 'shop_product' ? 'bg-emerald-500 hover:bg-emerald-600' : 'border-zinc-700 bg-transparent text-white hover:bg-zinc-900'}
                      onClick={() => setKindByTab((current) => ({ ...current, [tab]: 'shop_product' }))}
                    >
                      <ShoppingBag className="mr-2 h-4 w-4" />
                      Écran shop
                    </Button>
                    <Button
                      type="button"
                      variant={kindByTab[tab] === 'formation_enrollment' ? 'default' : 'outline'}
                      className={kindByTab[tab] === 'formation_enrollment' ? 'bg-orange-500 hover:bg-orange-600' : 'border-zinc-700 bg-transparent text-white hover:bg-zinc-900'}
                      onClick={() => setKindByTab((current) => ({ ...current, [tab]: 'formation_enrollment' }))}
                    >
                      <BookOpen className="mr-2 h-4 w-4" />
                      Écran formation
                    </Button>
                    <Button
                      type="button"
                      variant={kindByTab[tab] === 'teaching_studio' ? 'default' : 'outline'}
                      className={kindByTab[tab] === 'teaching_studio' ? 'bg-sky-500 hover:bg-sky-600' : 'border-zinc-700 bg-transparent text-white hover:bg-zinc-900'}
                      onClick={() => setKindByTab((current) => ({ ...current, [tab]: 'teaching_studio' }))}
                    >
                      <GraduationCap className="mr-2 h-4 w-4" />
                      Écran enseignement
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-zinc-700 bg-transparent text-white hover:bg-zinc-900"
                      onClick={() => applyScreen(null)}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Masquer
                    </Button>
                  </div>

                  <div className="relative">
                    <PackageSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                    <Input
                      value={searchByTab[tab]}
                      onChange={(event) => setSearchByTab((current) => ({ ...current, [tab]: event.target.value }))}
                      placeholder={kindByTab[tab] === 'shop_product' ? 'Rechercher un produit du marketplace...' : kindByTab[tab] === 'formation_enrollment' ? 'Rechercher une formation...' : 'Rechercher un studio enseignant...'}
                      className="border-zinc-800 bg-zinc-900 pl-10 text-white placeholder:text-zinc-500"
                    />
                  </div>

                  <div className="grid max-h-[34vh] gap-3 overflow-y-auto pr-1 sm:max-h-[52vh] xl:max-h-none xl:flex-1">
                    {kindByTab[tab] === 'shop_product' && filteredProducts.length === 0 && (
                      <Card className="border-dashed border-zinc-800 bg-zinc-950">
                        <CardContent className="py-10 text-center text-sm text-zinc-400">
                          Aucun produit marketplace disponible pour ce filtre.
                        </CardContent>
                      </Card>
                    )}
                    {kindByTab[tab] === 'formation_enrollment' && filteredFormations.length === 0 && (
                      <Card className="border-dashed border-zinc-800 bg-zinc-950">
                        <CardContent className="py-10 text-center text-sm text-zinc-400">
                          Aucune formation active disponible pour ce filtre.
                        </CardContent>
                      </Card>
                    )}
                    {kindByTab[tab] === 'teaching_studio' && filteredTeachingStudios.length === 0 && (
                      <Card className="border-dashed border-zinc-800 bg-zinc-950">
                        <CardContent className="py-10 text-center text-sm text-zinc-400">
                          Aucun studio enseignant disponible pour ce filtre.
                        </CardContent>
                      </Card>
                    )}

                    {kindByTab[tab] === 'shop_product' && filteredProducts.map((product) => {
                      const preview = buildScreenFromProduct(product);
                      const image = getLiveProductImage(product);
                      return (
                        <Card key={product.id} className="border-zinc-800 bg-zinc-900/80">
                          <CardContent className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
                            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-zinc-800">
                              {image ? (
                                <img src={image} alt={product.title} className="h-full w-full object-cover" />
                              ) : (
                                <ShoppingBag className="h-8 w-8 text-zinc-500" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-base font-semibold text-white">{product.title}</p>
                              <p className="mt-1 line-clamp-2 text-sm text-zinc-400">{product.description || 'Produit marketplace sans description.'}</p>
                              <p className="mt-2 text-sm font-bold text-emerald-300">{product.price.toLocaleString('fr-FR')} FCFA</p>
                            </div>
                            <Button onClick={() => applyScreen(preview)} className="w-full bg-emerald-500 text-white hover:bg-emerald-600 sm:w-auto">
                              {tab === 'public' ? 'Diffuser' : 'Privé'}
                            </Button>
                          </CardContent>
                        </Card>
                      );
                    })}

                    {kindByTab[tab] === 'formation_enrollment' && filteredFormations.map((formation) => {
                      const preview = buildScreenFromFormation(formation);
                      const image = getLiveFormationImage(formation);
                      return (
                        <Card key={formation.id} className="border-zinc-800 bg-zinc-900/80">
                          <CardContent className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
                            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-zinc-800">
                              {image ? (
                                <img src={image} alt={formation.title} className="h-full w-full object-cover" />
                              ) : (
                                <BookOpen className="h-8 w-8 text-zinc-500" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-base font-semibold text-white">{formation.title}</p>
                              <p className="mt-1 line-clamp-2 text-sm text-zinc-400">{formation.description || 'Formation sans description.'}</p>
                              <p className="mt-2 text-sm font-bold text-orange-300">
                                {formation.price > 0 ? `${formation.price.toLocaleString('fr-FR')} FCFA` : 'Gratuit'}
                              </p>
                            </div>
                            <Button onClick={() => applyScreen(preview)} className="w-full bg-orange-500 text-white hover:bg-orange-600 sm:w-auto">
                              {tab === 'public' ? 'Diffuser' : 'Privé'}
                            </Button>
                          </CardContent>
                        </Card>
                      );
                    })}

                    {kindByTab[tab] === 'teaching_studio' && filteredTeachingStudios.map((studioCard) => {
                      const image = studioCard.coverImageUrl;
                      return (
                        <Card key={studioCard.id} className="border-zinc-800 bg-zinc-900/80">
                          <CardContent className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
                            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-zinc-800">
                              {image ? (
                                <img src={image} alt={studioCard.title} className="h-full w-full object-cover" />
                              ) : (
                                <GraduationCap className="h-8 w-8 text-zinc-500" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-base font-semibold text-white">{studioCard.title}</p>
                              <p className="mt-1 line-clamp-2 text-sm text-zinc-400">{studioCard.subtitle}</p>
                              <p className="mt-2 text-xs font-medium text-sky-300">{studioCard.summary || 'Tableau, notes et documents en direct.'}</p>
                            </div>
                            <Button onClick={() => {
                              setStudioEditorOpen(true);
                            }} className="w-full bg-sky-500 text-white hover:bg-sky-600 sm:w-auto">
                              Configurer
                            </Button>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 xl:sticky xl:top-0">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                        {tab === 'public' ? 'Diffusion en cours' : 'Prévisualisation privée'}
                      </p>
                      <h3 className="mt-1 text-lg font-semibold text-white">
                        {currentScreen ? 'Écran actif' : 'Aucun écran sélectionné'}
                      </h3>
                    </div>
                    {currentScreen && (
                      <Button variant="outline" className="border-zinc-700 bg-transparent text-white hover:bg-zinc-800" onClick={() => applyScreen(null)}>
                        <X className="mr-2 h-4 w-4" />
                        Retirer
                      </Button>
                    )}
                  </div>

                  {currentScreen ? (
                    <div className="space-y-3">
                      <LiveScreenDisplay screen={currentScreen} variant={tab === 'public' ? 'public' : 'private'} isHost />
                      <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-950/70 p-3 text-sm text-zinc-400">
                        <div className="flex items-center gap-2 text-white/80">
                          <Eye className="h-4 w-4 text-amber-400" />
                          {tab === 'public' ? 'Visible immédiatement par les spectateurs.' : 'Visible uniquement pour vous dans le live.'}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex min-h-[260px] flex-col items-center justify-center rounded-xl border border-dashed border-zinc-700 bg-zinc-950/60 px-6 text-center text-zinc-400">
                      <Sparkles className="mb-3 h-8 w-8 text-amber-400/80" />
                      <p className="text-base font-medium text-white/90">Aucun écran {tab === 'public' ? 'public' : 'privé'} actif</p>
                      <p className="mt-2 text-sm">
                        Sélectionnez un produit marketplace, une formation ou un studio d’enseignement libre pour l’afficher pendant le live.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>

        <LiveTeachingStudioEditor
          open={studioEditorOpen}
          onOpenChange={setStudioEditorOpen}
          initialStudio={currentScreen?.type === 'teaching_studio' ? currentScreen.studio : null}
          onSave={(studio) => applyScreen(buildScreenFromStudio(studio))}
        />
      </DialogContent>
    </Dialog>
  );
};

export default LiveScreenManager;