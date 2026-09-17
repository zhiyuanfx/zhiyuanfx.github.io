import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';
const notes = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/notes' }),
  schema: z.object({ title: z.string().min(1), subtitle: z.string().optional(), date: z.coerce.date(), keywords: z.array(z.string().min(1)).min(1) }),
});
export const collections = { notes };
