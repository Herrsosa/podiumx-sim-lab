import { supabase } from "@/integrations/supabase/client";

export async function getOrCreateConversation(targetUserId: string): Promise<string> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) {
    throw authError;
  }
  const user = authData?.user;
  if (!user) {
    throw new Error("You must be signed in to send messages.");
  }

  if (user.id === targetUserId) {
    throw new Error("You cannot message yourself.");
  }

  const { data: participationRows, error: participationError } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", user.id);

  if (participationError) {
    throw participationError;
  }

  if (participationRows && participationRows.length > 0) {
    const conversationIds = participationRows.map((row) => row.conversation_id);
    const { data: existingMatch, error: matchError } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .in("conversation_id", conversationIds)
      .eq("user_id", targetUserId)
      .limit(1);

    if (matchError) {
      throw matchError;
    }

    if (existingMatch && existingMatch.length > 0) {
      return existingMatch[0].conversation_id;
    }
  }

  const { data: newConversation, error: createError } = await supabase
    .from("conversations")
    .insert({ creator_id: user.id })
    .select()
    .single();

  if (createError || !newConversation) {
    throw createError || new Error("Unable to create conversation.");
  }

  const conversationId = newConversation.id;

  const { error: participantsInsertError } = await supabase
    .from("conversation_participants")
    .insert([
      { conversation_id: conversationId, user_id: user.id },
      { conversation_id: conversationId, user_id: targetUserId },
    ]);

  if (participantsInsertError) {
    throw participantsInsertError;
  }

  return conversationId;
}

export async function sendMessage(conversationId: string, content: string) {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) {
    throw authError;
  }
  const user = authData?.user;
  if (!user) {
    throw new Error("You must be signed in to send messages.");
  }

  const { data, error } = await supabase
    .from("dm_messages")
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content,
    })
    .select()
    .single();

  if (error || !data) {
    throw error || new Error("Unable to send message.");
  }

  return data;
}
