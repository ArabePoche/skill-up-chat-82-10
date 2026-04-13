// Etape dediee a la configuration et au lancement d'un live depuis la modale video.
import { Globe, Loader2, Presentation, Radio, Timer, Users, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { LiveFormData, LiveStudioEditorState } from '../types';

interface VideoCreationLiveStepProps {
  liveData: LiveFormData;
  isLaunchingLive: boolean;
  studioEditor: LiveStudioEditorState;
  onChange: (updater: (current: LiveFormData) => LiveFormData) => void;
  onCancel: () => void;
  onLaunch: () => void;
}

export const VideoCreationLiveStep = ({
  liveData,
  isLaunchingLive,
  studioEditor,
  onChange,
  onCancel,
  onLaunch,
}: VideoCreationLiveStepProps) => (
  <DialogContent className="max-h-[100dvh] w-[calc(100vw-1rem)] max-w-lg overflow-y-auto border-0 bg-zinc-950 p-0 text-white sm:max-h-[90vh] sm:rounded-3xl">
    <div className="rounded-3xl bg-[radial-gradient(circle_at_top,_rgba(255,90,90,0.18),_transparent_42%),linear-gradient(160deg,#0b0b12_0%,#19111a_48%,#120f12_100%)] p-1">
      <div className="rounded-[22px] border border-white/10 bg-black/50 p-4 sm:p-6">
        <DialogHeader className="space-y-2 text-left">
          <DialogTitle className="text-xl font-semibold sm:text-2xl">Configurer le live</DialogTitle>
          <DialogDescription className="text-zinc-300">
            Choisissez le titre, la description et qui pourra rejoindre votre direct.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4 sm:mt-6">
          <div className="rounded-2xl border border-sky-500/30 bg-sky-500/5 p-3 sm:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/20 text-sky-300">
                  <Presentation size={20} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">Studio d'Enseignement Libre</p>
                  <p className="text-xs text-zinc-400">
                    {studioEditor.preparedStudio ? "Configuration prête (Modifiable en direct)" : 'Optionnel : préparez vos tableaux et documents'}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => studioEditor.setIsStudioEditorOpen(true)}
                className="w-full border-sky-500/50 text-sky-400 hover:bg-sky-500/10 hover:text-sky-300 sm:w-auto"
              >
                {studioEditor.preparedStudio ? 'Modifier' : 'Configurer'}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="live-title">Titre du live</Label>
            <Input
              id="live-title"
              value={liveData.title}
              onChange={(event) => onChange((current) => ({ ...current, title: event.target.value }))}
              placeholder="Exemple : Session questions-réponses"
              className="border-white/10 bg-white/5 text-white placeholder:text-zinc-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="live-description">Description</Label>
            <Textarea
              id="live-description"
              value={liveData.description}
              onChange={(event) => onChange((current) => ({ ...current, description: event.target.value }))}
              placeholder="Décrivez rapidement le sujet du live."
              className="min-h-20 border-white/10 bg-white/5 text-white placeholder:text-zinc-500 sm:min-h-24"
            />
          </div>

          <div className="space-y-2">
            <Label>Visibilité</Label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => onChange((current) => ({ ...current, visibility: 'public' }))}
                className={`rounded-2xl border p-3 text-left transition sm:p-4 ${liveData.visibility === 'public' ? 'border-red-400/60 bg-red-500/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
              >
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white sm:mb-3">
                  <Globe size={20} />
                </div>
                <div className="text-sm font-semibold">Tout le monde</div>
                <p className="mt-1 text-xs leading-5 text-zinc-300">Toute personne ayant le lien peut rejoindre le live.</p>
              </button>

              <button
                type="button"
                onClick={() => onChange((current) => ({ ...current, visibility: 'friends_followers' }))}
                className={`rounded-2xl border p-3 text-left transition sm:p-4 ${liveData.visibility === 'friends_followers' ? 'border-red-400/60 bg-red-500/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
              >
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white sm:mb-3">
                  <Users size={20} />
                </div>
                <div className="text-sm font-semibold">Amis et suiveurs</div>
                <p className="mt-1 text-xs leading-5 text-zinc-300">Seuls vos amis acceptés et vos followers peuvent regarder.</p>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Accès au live</Label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => onChange((current) => ({ ...current, isPaid: false, entryPrice: '' }))}
                className={`rounded-2xl border p-3 text-left transition sm:p-4 ${!liveData.isPaid ? 'border-emerald-400/60 bg-emerald-500/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
              >
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white sm:mb-3">
                  <Zap size={20} />
                </div>
                <div className="text-sm font-semibold">Gratuit</div>
                <p className="mt-1 text-xs leading-5 text-zinc-300">Accès libre sans frais d'entrée.</p>
              </button>

              <button
                type="button"
                onClick={() => onChange((current) => ({ ...current, isPaid: true }))}
                className={`rounded-2xl border p-3 text-left transition sm:p-4 ${liveData.isPaid ? 'border-emerald-400/60 bg-emerald-500/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
              >
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white sm:mb-3">
                  <Timer size={20} />
                </div>
                <div className="text-sm font-semibold">Payant</div>
                <p className="mt-1 text-xs leading-5 text-zinc-300">Fixez un prix d'entrée en FCFA.</p>
              </button>
            </div>

            {liveData.isPaid && (
              <div className="mt-3 space-y-1">
                <Label htmlFor="live-price">Prix d'entrée (FCFA)</Label>
                <Input
                  id="live-price"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  min="1"
                  step="1"
                  value={liveData.entryPrice}
                  onChange={(event) => {
                    const raw = event.target.value.replace(/[^0-9]/g, '');
                    onChange((current) => ({ ...current, entryPrice: raw }));
                  }}
                  placeholder="Ex : 500"
                  className="border-white/10 bg-white/5 text-white placeholder:text-zinc-500"
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Programmation</Label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => onChange((current) => ({ ...current, isScheduled: false, scheduledDate: '', scheduledTime: '' }))}
                className={`rounded-2xl border p-3 text-left transition sm:p-4 ${!liveData.isScheduled ? 'border-sky-400/60 bg-sky-500/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
              >
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white sm:mb-3">
                  <Radio size={20} />
                </div>
                <div className="text-sm font-semibold">Démarrer maintenant</div>
                <p className="mt-1 text-xs leading-5 text-zinc-300">Le live commence immédiatement.</p>
              </button>

              <button
                type="button"
                onClick={() => onChange((current) => ({ ...current, isScheduled: true }))}
                className={`rounded-2xl border p-3 text-left transition sm:p-4 ${liveData.isScheduled ? 'border-sky-400/60 bg-sky-500/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
              >
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white sm:mb-3">
                  <Timer size={20} />
                </div>
                <div className="text-sm font-semibold">Programmer</div>
                <p className="mt-1 text-xs leading-5 text-zinc-300">Choisissez une date et heure.</p>
              </button>
            </div>

            {liveData.isScheduled && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="live-date">Date</Label>
                  <Input
                    id="live-date"
                    type="date"
                    value={liveData.scheduledDate}
                    onChange={(event) => onChange((current) => ({ ...current, scheduledDate: event.target.value }))}
                    min={new Date().toISOString().split('T')[0]}
                    className="border-white/10 bg-white/5 text-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="live-time">Heure</Label>
                  <Input
                    id="live-time"
                    type="time"
                    value={liveData.scheduledTime}
                    onChange={(event) => onChange((current) => ({ ...current, scheduledTime: event.target.value }))}
                    className="border-white/10 bg-white/5 text-white"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="live-max">Places maximales (optionnel)</Label>
            <Input
              id="live-max"
              inputMode="numeric"
              pattern="[0-9]*"
              min="1"
              value={liveData.maxAttendees}
              onChange={(event) => {
                const raw = event.target.value.replace(/[^0-9]/g, '');
                onChange((current) => ({ ...current, maxAttendees: raw }));
              }}
              placeholder="Illimité si vide"
              className="border-white/10 bg-white/5 text-white placeholder:text-zinc-500"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-col-reverse gap-2 sm:mt-6 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
          <Button type="button" variant="ghost" className="w-full text-white hover:bg-white/10 hover:text-white sm:w-auto" onClick={onCancel}>
            Annuler
          </Button>
          <Button type="button" onClick={onLaunch} disabled={isLaunchingLive} className="w-full bg-red-600 text-white hover:bg-red-700 sm:w-auto">
            {isLaunchingLive ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Radio className="mr-2 h-4 w-4" />}
            {liveData.isScheduled ? 'Programmer le live' : 'Lancer le live'}
          </Button>
        </div>
      </div>
    </div>
  </DialogContent>
);