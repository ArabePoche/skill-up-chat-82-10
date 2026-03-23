-- Ajout des règles pour les posts (creation, like, comment)
INSERT INTO public.habbah_earning_rules (action_type, action_label, habbah_amount, daily_limit, monthly_limit, cooldown_seconds) VALUES
  ('post_create', 'Création de post', 5, 5, 50, 60),
  ('post_like', 'Like de post', 1, 50, 500, 0),
  ('post_comment', 'Commentaire sur post', 2, 20, 200, 30)
ON CONFLICT (action_type) DO UPDATE SET
  action_label = EXCLUDED.action_label,
  habbah_amount = EXCLUDED.habbah_amount,
  daily_limit = EXCLUDED.daily_limit,
  monthly_limit = EXCLUDED.monthly_limit,
  cooldown_seconds = EXCLUDED.cooldown_seconds;
