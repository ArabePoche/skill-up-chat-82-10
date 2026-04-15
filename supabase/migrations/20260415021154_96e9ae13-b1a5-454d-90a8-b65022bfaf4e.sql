
INSERT INTO storage.buckets (id, name, public)
VALUES ('school-templates', 'school-templates', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read school templates" ON storage.objects
FOR SELECT USING (bucket_id = 'school-templates');

CREATE POLICY "Authenticated upload school templates" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'school-templates' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated update school templates" ON storage.objects
FOR UPDATE USING (bucket_id = 'school-templates' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated delete school templates" ON storage.objects
FOR DELETE USING (bucket_id = 'school-templates' AND auth.role() = 'authenticated');
