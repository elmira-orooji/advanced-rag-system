
import { useEffect, useState } from "react";

import type {
  ChatMessage,
  ChatSession,
} from "../types/chat";

const STORAGE_KEY = "knowledgeflow-chats";

export function useChatHistory() {
  const [sessions, setSessions] =
    useState<ChatSession[]>([]);

  const [
    activeSessionId,
    setActiveSessionId,
  ] = useState<string | null>(
    null
  );

  /* Load chats from LocalStorage */
  useEffect(() => {
    const saved =
      localStorage.getItem(
        STORAGE_KEY
      );

    if (!saved) return;

    try {
      const parsed: ChatSession[] =
        JSON.parse(saved);

      setSessions(parsed);

      if (parsed.length > 0) {
        setActiveSessionId(
          parsed[0].id
        );
      }
    } catch (error) {
      console.error(
        "Failed to load chats:",
        error
      );
    }
  }, []);

  /* Save chats to LocalStorage */
  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(sessions)
    );
  }, [sessions]);

  /* Create new chat */
  const createNewChat = () => {
    const now =
      new Date().toISOString();

    const newSession: ChatSession =
      {
        id: crypto.randomUUID(),

        title: "New Chat",

        messages: [],

        createdAt: now,

        updatedAt: now,
      };

    setSessions((prev) => [
      newSession,
      ...prev,
    ]);

    setActiveSessionId(
      newSession.id
    );
  };

  /* Delete chat */
  const deleteChat = (
    sessionId: string
  ) => {
    setSessions((prev) =>
      prev.filter(
        (session) =>
          session.id !== sessionId
      )
    );

    if (
      activeSessionId === sessionId
    ) {
      setActiveSessionId(null);
    }
  };

  /* Update entire session */
  const updateSession = (
    session: ChatSession
  ) => {
    setSessions((prev) =>
      prev.map((chat) =>
        chat.id === session.id
          ? session
          : chat
      )
    );
  };

  /* Add message to active chat */
  const addMessage = (
    sessionId: string,
    message: ChatMessage
  ) => {
    setSessions((prev) =>
      prev.map((session) => {
        if (
          session.id !== sessionId
        ) {
          return session;
        }

        return {
          ...session,

          title:
            session.messages
              .length === 0 &&
            message.role === "user"
              ? message.content.slice(
                  0,
                  30
                )
              : session.title,

          messages: [
            ...session.messages,
            message,
          ],

          updatedAt:
            new Date().toISOString(),
        };
      })
    );
  };

  /* Current active chat */
  const activeSession =
    sessions.find(
      (session) =>
        session.id ===
        activeSessionId
    ) ?? null;

  return {
    sessions,

    activeSession,

    activeSessionId,

    setActiveSessionId,

    createNewChat,

    deleteChat,

    updateSession,

    addMessage,
  };
}

