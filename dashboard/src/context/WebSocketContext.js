import React, { createContext, useContext, useRef, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setStatus, addMessage, setUsername, clearMessages } from '../store/websocketSlice';

const WebSocketContext = createContext();

export const WebSocketProvider = ({ children }) => {
    const dispatch = useDispatch();
    const wsServer = process.env.WS_SERVER?process.env.WS_SERVER:'ws://localhost:8181'
    const { username } = useSelector((state) => state.websocket);
    const wsRef = useRef(null);
    const isConnectingRef = useRef(false); // Track connection status
    const reconnectAttempts = useRef(0);
    const maxReconnectAttempts = 5;
    const baseReconnectDelay = 3000; // 3 seconds
    const sentMessages = useRef(new Set()); // Track sent message IDs to prevent duplicates

    const connectWebSocket = useCallback(() => {
        if (isConnectingRef.current || wsRef.current) {
            console.log('WebSocket connection already in progress or exists, skipping...');
            return;
        }

        if (reconnectAttempts.current >= maxReconnectAttempts) {
            console.log('Max reconnect attempts reached. Giving up.');
            dispatch(setStatus('disconnected'));
            return;
        }

        isConnectingRef.current = true;
        const websocket = new WebSocket(wsServer);
        wsRef.current = websocket;
        console.log('Creating new WebSocket connection');
        dispatch(setStatus('connecting'));

        websocket.onopen = () => {
            console.log('WebSocket connected');
            dispatch(setStatus('connected'));
            websocket.send(JSON.stringify({ type: 'join', username }));
            reconnectAttempts.current = 0;
            isConnectingRef.current = false;
        };

        websocket.onmessage = (event) => {
            try {
              dispatch(clearMessages())
                const data = JSON.parse(event.data);
                // Deduplicate messages using a unique message ID
                const messageId = data.messageId || `${data.type}-${data.timestamp}-${data.content}`;
                if (sentMessages.current.has(messageId)) {
                    console.log('Duplicate message received, ignoring:', data);
                    return;
                }
                dispatch(addMessage(data));
            } catch (error) {
                console.error('Error parsing message:', error);
            }
        };

        websocket.onclose = () => {
            console.log('WebSocket disconnected');
            wsRef.current = null;
            dispatch(setStatus('disconnected'));
            isConnectingRef.current = false;
            if (reconnectAttempts.current < maxReconnectAttempts) {
                const delay = baseReconnectDelay * Math.pow(2, reconnectAttempts.current);
                console.log(`Attempting to reconnect in ${delay}ms... (Attempt ${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);
                setTimeout(() => {
                    reconnectAttempts.current += 1;
                    connectWebSocket();
                }, delay);
            }
        };

        websocket.onerror = (error) => {
            console.error('WebSocket error:', error);
            dispatch(setStatus('disconnected'));
            isConnectingRef.current = false;
        };
    }, [dispatch, username]);

    useEffect(() => {
        connectWebSocket();

        return () => {
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                console.log('Cleaning up WebSocket connection on unmount');
                wsRef.current.close();
            }
            isConnectingRef.current = false;
        };
    }, [connectWebSocket]);

    const sendMessage = (message) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            // Generate a unique message ID
            const messageId = `${message.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const messageWithId = { ...message, messageId };
            console.log('Sending message:', messageWithId);
            wsRef.current.send(JSON.stringify(messageWithId));
            sentMessages.current.add(messageId);
            // Clean up old message IDs to prevent memory leaks
            if (sentMessages.current.size > 1000) {
                const iterator = sentMessages.current.values();
                for (let i = 0; i < 500; i++) {
                    sentMessages.current.delete(iterator.next().value);
                }
            }
        } else {
            console.warn('WebSocket is not connected, cannot send message:', message);
        }
    };

    return (
        <WebSocketContext.Provider value={{ sendMessage }}>
            {children}
        </WebSocketContext.Provider>
    );
};

export const useWebSocket = () => useContext(WebSocketContext);