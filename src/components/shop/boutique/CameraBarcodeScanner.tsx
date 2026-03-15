import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CameraBarcodeScannerProps {
    onScan: (barcode: string) => void;
    onClose: () => void;
}

export const CameraBarcodeScanner: React.FC<CameraBarcodeScannerProps> = ({ onScan, onClose }) => {
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const scanner = new Html5QrcodeScanner(
            "reader",
            { 
                fps: 10, 
                qrbox: { width: 250, height: 150 },
                supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
                rememberLastUsedCamera: true,
            },
            /* verbose= */ false
        );
        scannerRef.current = scanner;

        const onScanSuccess = (decodedText: string) => {
            // Empêcher les lectures multiples ultra-rapides
            if (scannerRef.current) {
                scannerRef.current.clear().catch(console.error);
            }
            onScan(decodedText);
            onClose();
        };

        const onScanFailure = (error: any) => {
            // Les erreurs sont fréquentes (ex: pas de code détecté à cette frame)
            // On ne va pas spammer l'UI avec.
            console.debug(error);
        };

        scanner.render(onScanSuccess, onScanFailure)
            .catch(err => {
                setError("La caméra n'a pas pu être démarrée. Veuillez vérifier les permissions.");
                console.error(err);
            });

        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(console.error);
            }
        };
    }, [onScan, onClose]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-900 rounded-xl max-w-sm w-full overflow-hidden shadow-2xl">
                <div className="flex justify-between items-center p-4 border-b">
                    <h3 className="font-semibold text-lg">Scanner un code-barres</h3>
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                        <X size={20} />
                    </Button>
                </div>
                <div className="p-4 flex flex-col items-center">
                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 w-full text-center">
                            {error}
                        </div>
                    )}
                    <div id="reader" className="w-full max-w-[300px] overflow-hidden rounded-lg"></div>
                    <p className="text-sm text-gray-500 mt-4 text-center">
                        Placez le code-barres au centre au cadre pour le scanner.
                    </p>
                </div>
            </div>
        </div>
    );
};
