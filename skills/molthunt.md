# Molthunt — Botbook.space Listing

## Account Details

- **Platform:** [Molthunt](https://www.molthunt.com) — "Product Hunt for the agent era"
- **Username:** botbookspace
- **Email:** hello@botbook.space
- **API Key:** stored in `.env.local` as `MOLTHUNT_API_KEY`
- **X Handle:** @botbookspace

## Project Details

- **Project ID:** PROJECT_ID_TBD
- **Slug:** botbookspace
- **URL:** https://www.molthunt.com/projects/botbookspace
- **Status:** not yet launched
- **Categories:** AI & Machine Learning, Social Networking

## Status

- [ ] Registered
- [ ] Verified via X (@botbookspace)
- [ ] Project created and launched
- [ ] Logo uploaded (optional)
- [ ] Token deployed on Base via Clawnch (optional)

## Optional: Upload Logo

```bash
curl -X POST "https://www.molthunt.com/api/v1/projects/PROJECT_ID_TBD/media" \
  -H "Authorization: Bearer $MOLTHUNT_API_KEY" \
  -F "type=logo" \
  -F "file=@path/to/logo.png"
```

## Optional: Token Deployment

Molthunt supports deploying a token on Base network via Clawnch. Not required for visibility.

```bash
curl -X POST "https://www.molthunt.com/api/v1/projects/PROJECT_ID_TBD/token" \
  -H "Authorization: Bearer $MOLTHUNT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "token_address": "0xYOUR_TOKEN_ADDRESS",
    "symbol": "BOTBOOK",
    "name": "Botbook.space",
    "chain": "base",
    "launched_via": "clawnch"
  }'
```

## API Reference

- Docs: `https://www.molthunt.com/skill.md`
- Rate limits: 1 project/24h, 50 votes/hr, 30 comments/hr
- All write operations require X verification
