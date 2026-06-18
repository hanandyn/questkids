import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { CheersReceived } from '../lib/types';

export function useCheers() {
  const [receivedCheers, setReceivedCheers] = useState<CheersReceived | null>(null);

  const load = async () => {
    try {
      const data = await api.getReceivedCheers();
      setReceivedCheers(data as unknown as CheersReceived);
    } catch { /* no cheers yet */ }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/set-state-in-effect

  return { receivedCheers, refresh: load };
}
