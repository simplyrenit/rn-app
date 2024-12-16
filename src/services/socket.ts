import { io, Socket } from "socket.io-client";
import { SOCKET_URL } from "@/lib/config";
import { useGlobalContext } from "@/context/global-context";

interface Attachment {
  data: string;
  filename: string;
  content_type: string;
}

interface ChatMessage {
  type: "chat_message";
  recipient: string;
  sender: string;
  message: string;
  attachment?: Attachment;
}

class SocketService {
  private static instance: SocketService;
  private socket: Socket | null = null;

  private constructor() {}

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  private getRoomName(user1: string, user2: string): string {
    const sortedUsers = [user1, user2].sort();
    return `${sortedUsers[0]}_${sortedUsers[1]}`;
  }

  public connect(userId: string, otherUserId: string) {
    if (!this.socket) {
      const roomName = this.getRoomName(userId, otherUserId);
      const url = `${SOCKET_URL}${roomName}/`;

      this.socket = io(url, {
        auth: {
          userId,
        },
      });

      this.socket.on("connect", () => {
        console.log("Socket connected to room:", roomName);
      });

      this.socket.on("disconnect", () => {
        console.log("Socket disconnected");
      });

      this.socket.on("error", (error) => {
        console.error("Socket error:", error);
      });
    }
    return this.socket;
  }

  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  public joinRoom(conversationId: string) {
    if (this.socket) {
      this.socket.emit("join_room", { conversationId });
    }
  }

  public leaveRoom(conversationId: string) {
    if (this.socket) {
      this.socket.emit("leave_room", { conversationId });
    }
  }

  public sendMessage(
    message: string,
    recipient: string,
    sender: string,
    attachment?: Attachment
  ) {
    if (this.socket) {
      const chatMessage: ChatMessage = {
        type: "chat_message",
        recipient,
        sender,
        message,
        ...(attachment && { attachment }),
      };
      this.socket.emit("new_message", chatMessage);
    }
  }

  public onNewMessage(callback: (message: ChatMessage) => void) {
    if (this.socket) {
      this.socket.on("receive_message", callback);
    }
  }

  public onTyping(
    callback: (data: { userId: string; isTyping: boolean }) => void
  ) {
    if (this.socket) {
      this.socket.on("user_typing", callback);
    }
  }

  public emitTyping(conversationId: string, isTyping: boolean) {
    if (this.socket) {
      this.socket.emit("typing", { conversationId, isTyping });
    }
  }

  public getSocket() {
    return this.socket;
  }
}

export const socketService = SocketService.getInstance();

export function useSocket() {
  const { userDetails } = useGlobalContext();

  const connect = (otherUserId: string) => {
    if (userDetails?.username) {
      return socketService.connect(userDetails.username, otherUserId);
    }
    return null;
  };

  return {
    connect,
    disconnect: socketService.disconnect.bind(socketService),
    joinRoom: socketService.joinRoom.bind(socketService),
    leaveRoom: socketService.leaveRoom.bind(socketService),
    sendMessage: socketService.sendMessage.bind(socketService),
    onNewMessage: socketService.onNewMessage.bind(socketService),
    onTyping: socketService.onTyping.bind(socketService),
    emitTyping: socketService.emitTyping.bind(socketService),
    getSocket: socketService.getSocket.bind(socketService),
  };
}
