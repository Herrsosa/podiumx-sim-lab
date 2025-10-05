-- Add DELETE policy for posts table so users can delete their own posts
CREATE POLICY "posts_delete_self"
ON posts
FOR DELETE
USING (auth.uid() = author_id);