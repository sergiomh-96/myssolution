-- Create chat system tables with RLS

-- Chat channels
CREATE TABLE IF NOT EXISTS public.chat_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  type channel_type NOT NULL DEFAULT 'group',
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Chat channel members
CREATE TABLE IF NOT EXISTS public.chat_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  last_read_at timestamptz,
  UNIQUE(channel_id, user_id)
);

-- Chat messages
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- Enable RLS on all chat tables
ALTER TABLE public.chat_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_channels
-- Users can only see channels they're members of
-- Viewers can see all channels but cannot create/edit
CREATE POLICY "chat_channels_select" ON public.chat_channels
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_members
      WHERE channel_id = chat_channels.id AND user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'viewer')
    )
  );

-- All users except viewers can create channels
CREATE POLICY "chat_channels_insert" ON public.chat_channels
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager', 'sales_rep', 'support_agent')
    )
    AND created_by = auth.uid()
  );

-- Channel creators and admins can update channels
CREATE POLICY "chat_channels_update" ON public.chat_channels
  FOR UPDATE
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can delete channels
CREATE POLICY "chat_channels_delete" ON public.chat_channels
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for chat_members
-- Users can see members of channels they're in
CREATE POLICY "chat_members_select" ON public.chat_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_members cm
      WHERE cm.channel_id = chat_members.channel_id
      AND cm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Channel creators and admins can add members
CREATE POLICY "chat_members_insert" ON public.chat_members
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_channels
      WHERE id = channel_id
      AND (created_by = auth.uid() OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
      ))
    )
  );

-- Users can remove themselves, creators and admins can remove anyone
CREATE POLICY "chat_members_delete" ON public.chat_members
  FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.chat_channels
      WHERE id = channel_id AND created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for chat_messages
-- Users can only see messages in channels they're members of
CREATE POLICY "chat_messages_select" ON public.chat_messages
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.chat_members
      WHERE channel_id = chat_messages.channel_id
      AND user_id = auth.uid()
    )
  );

-- Channel members (except viewers) can send messages
CREATE POLICY "chat_messages_insert" ON public.chat_messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_members
      WHERE channel_id = chat_messages.channel_id
      AND user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager', 'sales_rep', 'support_agent')
    )
    AND user_id = auth.uid()
  );

-- Users can update their own messages
CREATE POLICY "chat_messages_update" ON public.chat_messages
  FOR UPDATE
  USING (user_id = auth.uid());

-- Users can delete their own messages (soft delete)
CREATE POLICY "chat_messages_delete" ON public.chat_messages
  FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create indexes for chat performance
CREATE INDEX idx_chat_channels_created_by ON public.chat_channels(created_by);
CREATE INDEX idx_chat_members_channel_id ON public.chat_members(channel_id);
CREATE INDEX idx_chat_members_user_id ON public.chat_members(user_id);
CREATE INDEX idx_chat_messages_channel_id ON public.chat_messages(channel_id);
CREATE INDEX idx_chat_messages_user_id ON public.chat_messages(user_id);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(created_at DESC);
