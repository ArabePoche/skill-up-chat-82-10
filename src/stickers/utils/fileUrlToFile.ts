// Convertit une URL de fichier (blob, data, http) en File utilisable pour l'éditeur
export async function fileUrlToFile(url: string, fileName: string): Promise<File> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new File([blob], fileName, { type: blob.type });
}
