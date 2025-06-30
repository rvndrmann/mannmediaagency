ALTER TABLE "public"."stories"
ADD CONSTRAINT "stories_choose_voice_fkey"
FOREIGN KEY ("choose voice")
REFERENCES "public"."choose voice"(id);

ALTER TABLE "public"."choose voice"
ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read voices"
ON "public"."choose voice"
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (true);