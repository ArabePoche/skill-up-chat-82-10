CREATE OR REPLACE FUNCTION public.delete_own_video(
  p_video_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_video public.videos%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Not authenticated');
  END IF;

  SELECT *
  INTO v_video
  FROM public.videos
  WHERE id = p_video_id
    AND author_id = v_user_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Video not found or not owned by current user');
  END IF;

  DELETE FROM public.video_comments WHERE video_id = v_video.id;
  DELETE FROM public.video_likes WHERE video_id = v_video.id;
  DELETE FROM public.video_views WHERE video_id = v_video.id;
  DELETE FROM public.saved_videos WHERE video_id = v_video.id;
  DELETE FROM public.notifications WHERE video_id = v_video.id;
  DELETE FROM public.series_videos WHERE video_id = v_video.id;

  DELETE FROM public.videos
  WHERE id = v_video.id
    AND author_id = v_user_id;

  RETURN json_build_object(
    'success', true,
    'video_id', v_video.id,
    'video_url', v_video.video_url,
    'thumbnail_url', v_video.thumbnail_url
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

REVOKE ALL ON FUNCTION public.delete_own_video(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_own_video(uuid) TO authenticated;