import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with environment variables
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      // Take data from the form request body
      const { email, phone, preference } = req.body;

      // Insert into your Supabase table "subscribers"
      const { data, error } = await supabase
        .from('subscribers')
        .insert([{ email, phone, preference }]);

      // Handle errors
      if (error) {
        return res.status(500).json({ error: error.message });
      }

      // Success response
      return res.status(200).json({ data });
    } catch (err) {
      // Catch unexpected errors
      return res.status(500).json({ error: err.message });
    }
  } else {
    // Block other request types
    res.status(405).json({ error: 'Method not allowed' });
  }
}
