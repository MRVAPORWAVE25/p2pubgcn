
CREATE POLICY "sight_posts read all"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'sight-posts');

CREATE POLICY "sight_posts owner insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'sight-posts' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "sight_posts owner update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'sight-posts' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'sight-posts' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "sight_posts owner delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'sight-posts' AND (storage.foldername(name))[1] = auth.uid()::text);
