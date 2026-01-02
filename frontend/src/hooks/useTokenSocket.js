// src/hooks/useTokenSocket.js
import { useEffect, useRef } from "react";

/**
 * Hook to subscribe to token events from backend WebSocket with auto-reconnect
 * @param {function} onNewToken - Callback invoked for new token events
 */
export function useTokenSocket(onNewToken) {
  const wsRef = useRef(null);
  const reconnectRef = useRef(1000); // initial reconnect delay: 1s

  useEffect(() => {
    let isMounted = true;

    function connect() {
      if (!isMounted) return;

      const ws = new WebSocket("ws://localhost:8080"); // replace with your server
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket connected");
        reconnectRef.current = 1000; // reset reconnect delay
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "buy" || data.type === "sell") {
            onNewToken(data);
          }
        } catch (err) {
          console.error("WebSocket parse error:", err);
        }
      };

      ws.onerror = (err) => {
        console.error("WebSocket error:", err);
      };

      ws.onclose = () => {
        console.log(
          `WebSocket disconnected, reconnecting in ${reconnectRef.current}ms`
        );
        if (!isMounted) return;
        setTimeout(() => {
          reconnectRef.current = Math.min(reconnectRef.current * 1.5, 30000); // max 30s
          connect();
        }, reconnectRef.current);
      };
    }

    connect();

    return () => {
      isMounted = false;
      wsRef.current?.close();
    };
  }, [onNewToken]);
}
