import { createClient } from '@supabase/supabase-js';
import { Command } from 'commander';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// --- Environment Variable Loading (Attempt) ---
// Explicitly load environment variables from .env file in the project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env'); // Assumes script is in 'scripts' dir
dotenv.config({ path: envPath });
// --- End Environment Variable Loading ---

const program = new Command();

program
  .name('list-projects')
  .description('Lists canvas projects from Supabase')
  .option('--url <url>', 'Supabase Project URL')
  .option('--key <key>', 'Supabase Anon Key');

program.parse(process.argv);
const options = program.opts();

async function listCanvasProjects() {
  // Prioritize command-line arguments, fall back to environment variables
  const supabaseUrl = options.url || process.env.SUPABASE_URL;
  const supabaseAnonKey = options.key || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
      'Error: Supabase URL and Anon Key must be provided either via command-line arguments (--url, --key) or environment variables (SUPABASE_URL, SUPABASE_ANON_KEY).'
    );
    process.exit(1);
  }

  // Create a Supabase client
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  console.log('Fetching canvas projects...');

  try {
    // Fetch projects from the 'canvas_projects' table
    const { data: projects, error } = await supabase
      .from('canvas_projects')
      .select('id, title'); // Select only id and title

    if (error) {
      console.error('Error fetching projects:', error.message);
      process.exit(1);
    }

    if (!projects || projects.length === 0) {
      console.log('No canvas projects found.');
    } else {
      console.log('Found Projects:');
      projects.forEach((project) => {
        console.log(`- ID: ${project.id}, Title: ${project.title || '(No Title)'}`);
      });
    }
  } catch (err) {
    console.error('An unexpected error occurred:', err);
    process.exit(1);
  }
}

listCanvasProjects();