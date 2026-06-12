export async function mockUploadMedia(file: File): Promise<{ url: string; name: string; size: number }> {
  await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 700));
  return {
    url: URL.createObjectURL(file),
    name: file.name,
    size: file.size
  };
}

export async function mockSchedulePost(post: any): Promise<{ success: boolean; id: string }> {
  await new Promise(resolve => setTimeout(resolve, 1000));
  if (Math.random() < 0.05) throw new Error("Mock network error during scheduling");
  return { success: true, id: `p_${Date.now()}` };
}

export async function mockSaveDraft(post: any): Promise<{ success: boolean; id: string }> {
  await new Promise(resolve => setTimeout(resolve, 500));
  return { success: true, id: `p_${Date.now()}` };
}

export async function mockPublishNow(postId: string): Promise<{ success: boolean }> {
  await new Promise(resolve => setTimeout(resolve, 1500));
  return { success: true };
}

export async function mockRetryPost(postId: string): Promise<{ success: boolean }> {
  await new Promise(resolve => setTimeout(resolve, 1500));
  return { success: true };
}

export async function mockSyncComments(): Promise<{ synced: number }> {
  await new Promise(resolve => setTimeout(resolve, 2000));
  return { synced: Math.floor(Math.random() * 5) };
}

export async function mockSendReply(commentId: string, reply: string): Promise<{ success: boolean }> {
  await new Promise(resolve => setTimeout(resolve, 1000));
  return { success: true };
}

export async function mockHideComment(commentId: string): Promise<{ success: boolean }> {
  await new Promise(resolve => setTimeout(resolve, 800));
  return { success: true };
}

export async function mockUpdateCommentStatus(commentId: string, status: string): Promise<{ success: boolean }> {
  await new Promise(resolve => setTimeout(resolve, 500));
  return { success: true };
}

export async function mockGenerateCaption(platform: string, topic: string): Promise<{ caption: string }> {
  await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));
  return { caption: `This is a mock AI generated caption for ${platform} about ${topic}. #MarineDecking #Craftsmanship` };
}

export async function mockGenerateReply(commentText: string, tone: string): Promise<{ reply: string }> {
  await new Promise(resolve => setTimeout(resolve, 1500));
  return { reply: `Mock AI reply (${tone} tone) to: "${commentText}". Please contact our team for more info!` };
}

export async function mockCreateWebsiteDraft(postId: string, type: string): Promise<{ success: boolean; draftId: string }> {
  await new Promise(resolve => setTimeout(resolve, 1000));
  return { success: true, draftId: `wp_${Date.now()}` };
}

export async function mockCheckConnection(accountId: string): Promise<{ connected: boolean; status: string }> {
  await new Promise(resolve => setTimeout(resolve, 800));
  return { connected: true, status: "connected" };
}