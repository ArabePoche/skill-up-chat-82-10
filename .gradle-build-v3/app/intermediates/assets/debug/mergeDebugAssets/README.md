# Dossier assets (Capacitor)

Ce dossier contient les fichiers générés/consommés par Capacitor côté Android.

- `capacitor.config.json` : copie de la configuration Capacitor incluse dans l’APK.
- `capacitor.plugins.json` : liste des plugins détectés côté Android.

Ils peuvent être régénérés lors de `npx cap sync android`. Nous créons ce dossier
pour éviter les erreurs ENOENT lors de la synchronisation.