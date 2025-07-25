
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const SupabaseConnectionTest = () => {
  const [connectionStatus, setConnectionStatus] = useState<'testing' | 'connected' | 'error'>('testing');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const testConnection = async () => {
      try {
        const { data, error } = await supabase.from('formations').select('count', { count: 'exact', head: true });
        
        if (error) {
          setConnectionStatus('error');
          setError(error.message);
        } else {
          setConnectionStatus('connected');
          console.log('Supabase connection successful!');
        }
      } catch (err) {
        setConnectionStatus('error');
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    };

    testConnection();
  }, []);

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="font-semibold mb-2">Supabase Connection Status</h3>
      {connectionStatus === 'testing' && (
        <p className="text-yellow-600">Testing connection...</p>
      )}
      {connectionStatus === 'connected' && (
        <p className="text-green-600">✅ Connected to Supabase successfully!</p>
      )}
      {connectionStatus === 'error' && (
        <div className="text-red-600">
          <p>❌ Connection failed</p>
          {error && <p className="text-sm mt-1">Error: {error}</p>}
        </div>
      )}
    </div>
  );
};

export default SupabaseConnectionTest;
