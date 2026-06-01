/**
 * Chat-related database operations.
 * Extracted from api/chat/route.ts to follow Single Responsibility Principle.
 */

type SupabaseClient = any; // edge runtime doesn't support full type

export interface ConversationMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Verify a conversation belongs to a user, then fetch its message history.
 */
export async function getConversationHistory(
  supabase: SupabaseClient,
  conversationId: string,
  userId: string,
  limit = 20,
): Promise<{ messages: ConversationMessage[]; valid: boolean }> {
  const { data: convCheck } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("user_id", userId)
    .single();

  if (!convCheck) {
    return { messages: [], valid: false };
  }

  const { data: messages } = await supabase
    .from("messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(limit);

  return {
    valid: true,
    messages:
      messages?.map((m: { role: string; content: string }) => ({
        role: m.role as "system" | "user" | "assistant",
        content: m.content,
      })) || [],
  };
}

/**
 * Create a new conversation (and optionally a project) if needed.
 */
export async function ensureConversation(
  supabase: SupabaseClient,
  userId: string,
  projectId: string | undefined,
  projectName: string,
  preferences: Record<string, unknown> | null,
): Promise<{
  conversationId: string;
  projectId: string;
  createdConversationId?: string;
  createdProjectId?: string;
}> {
  let projectIdToUse = projectId;
  let createdProjectId: string | undefined;
  let createdConversationId: string | undefined;

  if (!projectIdToUse) {
    const { data: newProject, error: projectError } = await supabase
      .from("projects")
      .insert({
        user_id: userId,
        name: projectName,
        status: "draft",
        mode: preferences ? "manual" : "ai_auto",
        preferences: preferences || null,
      })
      .select("id")
      .single();

    if (projectError || !newProject?.id) {
      throw projectError || new Error("Failed to create project");
    }

    projectIdToUse = newProject.id;
    createdProjectId = newProject.id;
  }

  const { data: newConv, error: conversationError } = await supabase
    .from("conversations")
    .insert({
      project_id: projectIdToUse,
      user_id: userId,
    })
    .select("id")
    .single();

  if (conversationError || !newConv?.id) {
    throw conversationError || new Error("Failed to create conversation");
  }

  conversationIdToUse = newConv.id;
  createdConversationId = newConv.id;

  return {
    conversationId: conversationIdToUse as string,
    projectId: projectIdToUse as string,
    createdConversationId,
    createdProjectId,
  };
}

/**
 * Save user and assistant messages to a conversation.
 */
export async function saveMessages(
  supabase: SupabaseClient,
  conversationId: string,
  userMessage: string,
  assistantReply: string,
  plan: string,
): Promise<void> {
  const { error } = await supabase.from("messages").insert([
    {
      conversation_id: conversationId,
      role: "user",
      content: userMessage,
      metadata: {},
    },
    {
      conversation_id: conversationId,
      role: "assistant",
      content: assistantReply,
      metadata: { model: plan === "hengker" ? "gemini-pro" : "gemini-flash" },
    },
  ]);

  if (error) throw error;
}

/**
 * Roll back database records created during a failed streaming attempt.
 */
export async function rollbackStreamInserts(
  supabase: SupabaseClient,
  userId: string,
  createdConversationId?: string,
  createdProjectId?: string,
): Promise<void> {
  if (createdConversationId) {
    const { error } = await supabase
      .from("conversations")
      .delete()
      .eq("id", createdConversationId)
      .eq("user_id", userId);
    if (error) throw error;
  }

  if (createdProjectId) {
    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", createdProjectId)
      .eq("user_id", userId);
    if (error) throw error;
  }
}

// Fix: need to declare the variable
let conversationIdToUse: string;
