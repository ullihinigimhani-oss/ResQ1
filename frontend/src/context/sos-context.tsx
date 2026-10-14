import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { useAuth } from './auth-context';
import { getActiveSOSRequestsForVolunteer, respondToSOSRequest } from '@/services/sosService';
import type { SOSRequestWithUser } from '@/types/sos';

type SOSContextValue = {
  sosRequest: SOSRequestWithUser | null;
  modalVisible: boolean;
  respondToSOS: (accept: boolean) => Promise<void>;
  closeModal: () => void;
};

const SOSContext = createContext<SOSContextValue | undefined>(undefined);

export function SOSProvider({ children }: { children: ReactNode }) {
  const { token, user } = useAuth();
  const [sosRequest, setSosRequest] = useState<SOSRequestWithUser | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const isWeb = Platform.OS === 'web';

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setSosRequest(null);
  }, []);

  const respondToSOS = useCallback(async (accept: boolean) => {
    if (!token || !sosRequest) return;

    try {
      await respondToSOSRequest(token, sosRequest.id, accept);
      closeModal();
    } catch (error) {
      console.error('Failed to respond to SOS:', error);
    }
  }, [token, sosRequest, closeModal]);

  useEffect(() => {
    if (token && user?.isVolunteeringActive && !isWeb) {
      const checkActiveSOS = async () => {
        try {
          const requests = await getActiveSOSRequestsForVolunteer(token);
          if (requests && requests.length > 0 && !modalVisible) {
            setSosRequest(requests[0]);
            setModalVisible(true);
          }
        } catch (error) {
          console.error('Failed to check active SOS requests:', error);
        }
      };

      checkActiveSOS();
      const interval = setInterval(checkActiveSOS, 5000);

      return () => clearInterval(interval);
    }
  }, [token, user?.isVolunteeringActive, modalVisible, isWeb]);

  return (
    <SOSContext.Provider value={{ sosRequest, modalVisible, respondToSOS, closeModal }}>
      {children}
    </SOSContext.Provider>
  );
}

export function useSOS() {
  const context = useContext(SOSContext);
  if (!context) {
    throw new Error('useSOS must be used within SOSProvider');
  }
  return context;
}
