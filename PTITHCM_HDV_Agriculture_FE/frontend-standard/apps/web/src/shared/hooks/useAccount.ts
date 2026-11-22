import { useSyncExternalStore } from 'react';
import { getSession, subscribeSession } from '@agri/api-client';
export const useAccount = () => useSyncExternalStore(subscribeSession, getSession);
