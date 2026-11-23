/*
  Live features. Leave a value empty and that feature stays off.

  1. Live "here now" counter and other visitors' cursors (Supabase Realtime, free tier)
     supabase.com > New project > Project Settings > API:
     copy the Project URL and the "anon public" key below.
     The anon key is meant to be public; it only allows realtime messages here.

  2. Private heatmaps, scroll depth and session recordings (Microsoft Clarity, free)
     clarity.microsoft.com > New project > Settings > Setup:
     copy the project ID (the short code in the tracking snippet) below.
     Only you see the results, in the Clarity dashboard.

  Test the live features without any account: open the page twice with ?live=demo
  at the end of the address. The two tabs see each other.
*/
window.LIVE_CONFIG = {
  supabaseUrl: 'https://snnuuslehoahbkrcgbyq.supabase.co',
  supabaseAnonKey: 'sb_publishable_RjAbT74jPJT-PMo4iuNgLQ_2y843kKx',
  clarityId: '',
};
