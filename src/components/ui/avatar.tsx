import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"

import { cn } from "@/lib/utils"
import { fileStore } from "@/file-manager/stores/FileStore"
import { fileStatusCache } from "@/file-manager/stores/FileStatusCache"

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
      className
    )}
    {...props}
  />
))
Avatar.displayName = AvatarPrimitive.Root.displayName

/**
 * AvatarImage offline-first.
 *
 * Comportement:
 * 1. Lit le cache mémoire (synchronous) → si le blob local existe, on l'affiche immédiatement.
 * 2. Sinon on lit IndexedDB en arrière-plan ; si trouvé, on bascule sur l'URL blob.
 * 3. Pendant ce temps on affiche la `src` distante (l'UA gère son cache HTTP).
 * 4. Quand l'image distante se charge avec succès, on snapshot les bytes en arrière-plan
 *    pour les avoir disponibles hors-ligne au prochain montage.
 *
 * Compatible avec tous les usages existants: aucune signature à changer côté appelant.
 */
const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, src, onLoadingStatusChange, ...props }, ref) => {
  const remoteSrc = typeof src === "string" && src.length > 0 ? src : null

  const fileId = React.useMemo(() => {
    if (!remoteSrc) return null
    return fileStore.generateFileId(remoteSrc)
  }, [remoteSrc])

  // Lecture synchrone du cache mémoire
  const initialBlobUrl = React.useMemo(() => {
    if (!fileId) return null
    const cached = fileStatusCache.get(fileId)
    return cached?.status === "downloaded" ? cached.blobUrl : null
  }, [fileId])

  const [blobUrl, setBlobUrl] = React.useState<string | null>(initialBlobUrl)

  React.useEffect(() => {
    setBlobUrl(initialBlobUrl)
  }, [fileId, initialBlobUrl])

  // Lecture asynchrone IndexedDB
  React.useEffect(() => {
    if (!fileId || !remoteSrc) return
    if (blobUrl) return
    let cancelled = false
    ;(async () => {
      try {
        const localFile = await fileStore.getFileById(fileId)
        if (cancelled || !localFile?.blob) return
        const url = URL.createObjectURL(localFile.blob)
        fileStatusCache.set(fileId, {
          fileId,
          status: "downloaded",
          blobUrl: url,
          checkedAt: Date.now(),
          remoteUrl: remoteSrc,
        })
        setBlobUrl(url)
      } catch {
        /* ignore */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [fileId, remoteSrc, blobUrl])

  // Snapshot en arrière-plan quand l'image distante a chargé avec succès
  const persistInFlightRef = React.useRef(false)
  const handleLoadingStatusChange = React.useCallback(
    (status: "idle" | "loading" | "loaded" | "error") => {
      onLoadingStatusChange?.(status)
      if (status !== "loaded") return
      if (!fileId || !remoteSrc) return
      if (blobUrl) return
      if (persistInFlightRef.current) return
      if (typeof navigator !== "undefined" && navigator.onLine === false) return

      persistInFlightRef.current = true
      ;(async () => {
        try {
          const response = await fetch(remoteSrc)
          if (!response.ok) return
          const blob = await response.blob()
          const url = URL.createObjectURL(blob)
          fileStatusCache.set(fileId, {
            fileId,
            status: "downloaded",
            blobUrl: url,
            checkedAt: Date.now(),
            remoteUrl: remoteSrc,
          })
          fileStore
            .saveFile(fileId, blob, {
              remoteUrl: remoteSrc,
              fileName: "avatar",
              fileType: blob.type || "image/*",
              fileSize: blob.size,
              isOwnFile: false,
            })
            .catch(() => {
              /* ignore */
            })
        } catch {
          /* ignore */
        } finally {
          persistInFlightRef.current = false
        }
      })()
    },
    [fileId, remoteSrc, blobUrl, onLoadingStatusChange]
  )

  const effectiveSrc = blobUrl || remoteSrc || undefined

  return (
    <AvatarPrimitive.Image
      ref={ref}
      className={cn("aspect-square h-full w-full", className)}
      src={effectiveSrc}
      onLoadingStatusChange={handleLoadingStatusChange}
      {...props}
    />
  )
})
AvatarImage.displayName = AvatarPrimitive.Image.displayName

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-muted",
      className
    )}
    {...props}
  />
))
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

export { Avatar, AvatarImage, AvatarFallback }
