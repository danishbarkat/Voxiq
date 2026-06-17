import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { WS_URL } from '../config/env';
import { clearToken, forceLogout, getToken, LOGIN_SYNC_KEY, LOGOUT_SYNC_KEY } from '../lib/auth';

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        const socketInstance = io(WS_URL, {
            withCredentials: true,
            transports: ['websocket'],
            auth: (() => {
                const token = getToken();
                return token ? { token } : undefined;
            })(),
        });

        socketInstance.on('connect', () => {
            console.log('Connected to WebSocket');
            setIsConnected(true);
        });

        socketInstance.on('disconnect', () => {
            console.log('Disconnected from WebSocket');
            setIsConnected(false);
        });

        socketInstance.on('auth:force-logout', (payload) => {
            forceLogout(
                payload?.reason ||
                'You have been logged out from this tab or device because this account signed in from another browser or device.',
            );
            socketInstance.disconnect();
        });

        setSocket(socketInstance);

        return () => {
            socketInstance.disconnect();
        };
    }, []);

    useEffect(() => {
        const handleStorage = (event) => {
            if (event.key === LOGIN_SYNC_KEY && getToken()) {
                forceLogout(
                    'You have been logged out from this tab because this account signed in from another tab.',
                    { broadcast: false },
                );
                return;
            }

            if (event.key === LOGOUT_SYNC_KEY && socket) {
                clearToken();
                socket.disconnect();
            }
        };

        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, [socket]);

    const reconnect = useCallback(() => {
        if (socket) {
            const token = getToken();
            socket.auth = token ? { token } : undefined;
            socket.disconnect().connect();
        }
    }, [socket]);

    const disconnectForLogout = useCallback(() => {
        if (socket) {
            socket.auth = undefined;
            socket.disconnect();
        }
        setIsConnected(false);
    }, [socket]);

    return (
        <SocketContext.Provider value={{ socket, isConnected, reconnect, disconnectForLogout }}>
            {children}
        </SocketContext.Provider>
    );
};
