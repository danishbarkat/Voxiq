import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { WS_URL } from '../config/env';
import { getToken } from '../lib/auth';

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

        setSocket(socketInstance);

        return () => {
            socketInstance.disconnect();
        };
    }, []);

    const reconnect = useCallback(() => {
        if (socket) {
            const token = getToken();
            socket.auth = token ? { token } : undefined;
            socket.disconnect().connect();
        }
    }, [socket]);

    return (
        <SocketContext.Provider value={{ socket, isConnected, reconnect }}>
            {children}
        </SocketContext.Provider>
    );
};
