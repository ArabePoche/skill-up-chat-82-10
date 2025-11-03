-- Fonction pour notifier les utilisateurs ayant interagi avec un post modifié
CREATE OR REPLACE FUNCTION public.notify_post_edited(
  p_post_id UUID,
  p_author_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_post_title TEXT;
BEGIN
  -- Récupérer un extrait du contenu du post
  SELECT 
    CASE 
      WHEN LENGTH(content) > 50 THEN SUBSTRING(content, 1, 50) || '...'
      ELSE content
    END
  INTO v_post_title
  FROM posts
  WHERE id = p_post_id;

  -- Notifier tous les utilisateurs qui ont liké le post (sauf l'auteur)
  FOR v_user_id IN 
    SELECT DISTINCT user_id 
    FROM post_likes 
    WHERE post_id = p_post_id 
      AND user_id != p_author_id
  LOOP
    INSERT INTO notifications (
      title,
      message,
      type,
      user_id,
      post_id,
      is_read
    ) VALUES (
      'Post modifié',
      'Un post que vous avez aimé a été modifié : "' || COALESCE(v_post_title, 'Post') || '". Voulez-vous maintenir votre réaction ?',
      'post_edited',
      v_user_id,
      p_post_id,
      false
    );
  END LOOP;

  -- Notifier tous les utilisateurs qui ont commenté le post (sauf l'auteur)
  FOR v_user_id IN 
    SELECT DISTINCT user_id 
    FROM post_comments 
    WHERE post_id = p_post_id 
      AND user_id != p_author_id
  LOOP
    -- Vérifier si une notification n'a pas déjà été créée (pour éviter les doublons)
    IF NOT EXISTS (
      SELECT 1 FROM notifications 
      WHERE user_id = v_user_id 
        AND post_id = p_post_id 
        AND type = 'post_edited'
        AND created_at > NOW() - INTERVAL '1 minute'
    ) THEN
      INSERT INTO notifications (
        title,
        message,
        type,
        user_id,
        post_id,
        is_read
      ) VALUES (
        'Post modifié',
        'Un post sur lequel vous avez commenté a été modifié : "' || COALESCE(v_post_title, 'Post') || '". Voulez-vous maintenir votre commentaire ?',
        'post_edited',
        v_user_id,
        p_post_id,
        false
      );
    END IF;
  END LOOP;
END;
$$;