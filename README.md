# Shelf

Bookmarking app with semantic search, browser extension, and automatic metadata enrichment.

## Features

### Web App
- **Authentication**: Email/password sign up, sign in, forgot password, reset password
- **Add bookmarks**: Paste URLs to save bookmarks
- **Semantic search**: Find bookmarks by meaning, not just keywords. Uses `pgvector` + OpenAI embeddings with keyword fallback
- **Tag filtering**: Filter bookmarks by tags (X, YouTube, LinkedIn, Websites, Snippets)
- **Keyboard shortcuts**: 
  - `Cmd/Ctrl+K` to add bookmarks
  - `Cmd/Ctrl+F` to search
  - `Escape` to clear and reset
- **Delete with undo**: Remove bookmarks with undo support
- **Metadata refresh**: Refresh bookmark metadata on demand
- **Privacy policy**: Built-in privacy page

### Browser Extension
- **One-click saving**: Save any page with a single click
- **Context menu**: Right-click to save pages, links, or selected text
- **OAuth integration**: Authenticates with web app via extension callback page
- **Auto-detection**: Web app detects when extension is installed

## Setup

### Prerequisites
- Node.js 18+
- Supabase account
- OpenAI API key

### Database Setup
1. Create a Supabase project
2. In Supabase SQL editor, run:
   - `supabase/migrations/0001_init.sql`
   - `supabase/seed.sql`

### Edge Functions
Deploy these Supabase Edge Functions:
- `supabase/functions/metadata_fetch` - Fetches page metadata
- `supabase/functions/embedding_upsert` - Generates and stores embeddings

### Environment Variables
Copy `env.example` to `.env.local` and fill in:

```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_key
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
EMBEDDINGS_PROVIDER=openai
```

### Install and Run
```bash
npm install
npm run dev
```

### Browser Extension
1. Build the extension:
   ```bash
   npm run build:extension
   ```
2. Load the `extension` folder in Chrome/Edge:
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `extension` folder

Or package for distribution:
```bash
npm run package:extension
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run build:extension` - Build browser extension
- `npm run package:extension` - Package extension as ZIP
- `npm run backfill-tags` - Backfill tags for existing bookmarks

## Architecture

- **Frontend**: Next.js 15 with React 19
- **Database**: Supabase (PostgreSQL with `pgvector`)
- **Auth**: Supabase Auth
- **Search**: Semantic search via OpenAI embeddings stored in `pgvector`
- **Metadata**: Fetched via Supabase Edge Functions
- **Extension**: Chrome Extension Manifest V3

## Security Notes

- The service role key is only used server-side and in Supabase Edge Functions. Never expose it to the browser.
- Row-level security policies ensure users can only access their own bookmarks.
- Extension uses OAuth flow for secure authentication with the web app.

