import toast from "react-hot-toast";
import { useEffect, useState } from "react";

import type {
  ChatMessage,
  ChatSession,
} from "../types/chat";

const STORAGE_KEY = "knowledgeflow-chats";

function readStoredChats() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return { sessions: [] as ChatSession[], activeSessionId: null as string | null };
  try {
    const sessions = JSON.parse(saved) as ChatSession[];
    return { sessions, activeSessionId: sessions[0]?.id ?? null };
  } catch (error) {
    console.error("Failed to load chats:", error);
    return { sessions: [] as ChatSession[], activeSessionId: null as string | null };
  }
}

export function useChatHistory() {
  const [initialChats] = useState(readStoredChats);
  const [sessions, setSessions] =
    useState<ChatSession[]>(initialChats.sessions);

  const [
    activeSessionId,
    setActiveSessionId,
  ] = useState<string | null>(initialChats.activeSessionId);

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

        title: "Untitled Chat",

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

  const deleteChat = (id: string) => {
  setSessions((prev) => {
    const updatedSessions =
      prev.filter(
        (session) =>
          session.id !== id
      );

    return updatedSessions;
  });

  toast.success(
    "Chat deleted"
  );
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

