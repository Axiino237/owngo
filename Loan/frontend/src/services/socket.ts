import { io, Socket } from 'socket.io-client';

const getWsBase = () => {
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL;
  if (typeof window !== 'undefined') {
    if (window.location.protocol === 'https:') {
      return window.location.origin;
    }
    return `http://${window.location.hostname}:3001`;
  }
  return 'http://localhost:3001';
};

const WS_URL = getWsBase();

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(WS_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
  }
  return socket;
};
