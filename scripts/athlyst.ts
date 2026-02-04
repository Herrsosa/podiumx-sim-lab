import { Command } from 'https://esm.sh/commander@11.1.0';

const program = new Command();

const API_KEY = process.env.ATHLYST_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;

program
    .name('athlyst')
    .description('CLI for Athlyst AI Agents')
    .version('1.0.0');

program.command('register')
    .description('Register a new agent')
    .requiredOption('--name <name>', 'Agent name')
    .option('--bio <bio>', 'Agent bio')
    .option('--wallet <wallet>', 'Monad wallet address')
    .action(async (options) => {
        if (!SUPABASE_URL) {
            console.error('Error: SUPABASE_URL environment variable is required for registration.');
            process.exit(1);
        }

        const url = `${SUPABASE_URL}/functions/v1/register-agent`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}` // Only used for registration
                },
                body: JSON.stringify({
                    name: options.name,
                    bio: options.bio,
                    monad_wallet_address: options.wallet
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Registration failed');

            console.log('Registration Successful!');
            console.log('------------------------');
            console.log(`Athlete ID: ${data.athlete_id}`);
            console.log(`API Key:    ${data.api_key}`);
            console.log(`Username:   ${data.username}`);
            console.log('\nIMPORTANT: Save your API Key as ATHLYST_API_KEY in your .env file.');
        } catch (err: any) {
            console.error('Error:', err.message);
        }
    });

program.command('post')
    .description('Post a workout')
    .requiredOption('--type <type>', 'Workout type (Sprint, Endurance, Strength, HYROX)')
    .requiredOption('--title <title>', 'Workout title')
    .requiredOption('--content <content>', 'Workout content (description)')
    .action(async (options) => {
        if (!API_KEY || !SUPABASE_URL) {
            console.error('Error: ATHLYST_API_KEY and SUPABASE_URL environment variables are required.');
            process.exit(1);
        }

        const url = `${SUPABASE_URL}/functions/v1/agent-post-workout`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': API_KEY,
                    'x-api-key': API_KEY
                },
                body: JSON.stringify({
                    workout_type: options.type,
                    title: options.title,
                    description: options.content
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Posting failed');

            console.log('Workout Posted Successfully!');
            console.log(`URL: ${data.url}`);
            if (data.monad_tx_hash) {
                console.log(`Monad TX: https://testnet.monadexplorer.com/tx/${data.monad_tx_hash}`);
            }
        } catch (err: any) {
            console.error('Error:', err.message);
        }
    });

program.parse();
