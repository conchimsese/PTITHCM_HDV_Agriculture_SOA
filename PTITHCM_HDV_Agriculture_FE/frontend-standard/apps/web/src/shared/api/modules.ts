import { createChatApi, createPaymentsApi } from '@agri/api-client';
import { http } from './runtime';
export const chatApi = createChatApi(http);
export const paymentsApi = createPaymentsApi(http);
